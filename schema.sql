--
-- PostgreSQL database dump
--

\restrict qhoa7PiQaufsOvauiT8SwwsiG5VGqDGFRuBFwDGMBTZoLTVQUzYqYmxkMJ6PrsB

-- Dumped from database version 17.7 (Debian 17.7-3.pgdg13+1)
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'Datos de ejemplo de turnos cargados. Ver v_turnos_completos para verificar.';


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'B??squedas de texto similares (fuzzy)';


--
-- Name: unaccent; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;


--
-- Name: EXTENSION unaccent; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION unaccent IS 'text search dictionary that removes accents';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'Generaci??n de UUIDs';


--
-- Name: estado_alerta; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.estado_alerta AS ENUM (
    'ACTIVA',
    'ATENDIDA',
    'RESUELTA',
    'IGNORADA',
    'EXPIRADA'
);


--
-- Name: estado_persona_accidente; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.estado_persona_accidente AS ENUM (
    'ILESO',
    'HERIDO_LEVE',
    'HERIDO_MODERADO',
    'HERIDO_GRAVE',
    'FALLECIDO'
);


--
-- Name: estado_situacion_persistente; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.estado_situacion_persistente AS ENUM (
    'ACTIVA',
    'EN_PAUSA',
    'FINALIZADA'
);


--
-- Name: estado_ubicacion_brigada; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.estado_ubicacion_brigada AS ENUM (
    'CON_UNIDAD',
    'EN_PUNTO_FIJO',
    'PRESTADO'
);


--
-- Name: severidad_alerta; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.severidad_alerta AS ENUM (
    'BAJA',
    'MEDIA',
    'ALTA',
    'CRITICA'
);


--
-- Name: tipo_accidente; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tipo_accidente AS ENUM (
    'COLISION_FRONTAL',
    'COLISION_LATERAL',
    'COLISION_TRASERA',
    'VOLCADURA',
    'ATROPELLO',
    'CAIDA_DE_MOTO',
    'SALIDA_DE_CARRIL',
    'CHOQUE_OBJETO_FIJO',
    'MULTIPLE',
    'OTRO'
);


--
-- Name: tipo_alerta; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tipo_alerta AS ENUM (
    'EMERGENCIA',
    'UNIDAD_SIN_ACTIVIDAD',
    'INSPECCION_PENDIENTE',
    'BRIGADA_FUERA_ZONA',
    'COMBUSTIBLE_BAJO',
    'MANTENIMIENTO_REQUERIDO',
    'APROBACION_REQUERIDA',
    'SISTEMA',
    'PERSONALIZADA'
);


--
-- Name: tipo_lesion; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tipo_lesion AS ENUM (
    'NINGUNA',
    'CONTUSIONES',
    'LACERACIONES',
    'FRACTURAS',
    'TRAUMA_CRANEAL',
    'TRAUMA_TORACICO',
    'TRAUMA_ABDOMINAL',
    'QUEMADURAS',
    'AMPUTACION',
    'MULTIPLE',
    'OTRO'
);


--
-- Name: tipo_movimiento_brigada; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tipo_movimiento_brigada AS ENUM (
    'PRESTAMO',
    'RETORNO_PRESTAMO',
    'DIVISION',
    'REUNION',
    'CAMBIO_UNIDAD',
    'ASIGNACION_SITUACION',
    'DESASIGNACION_SITUACION'
);


--
-- Name: tipo_vehiculo_accidente; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tipo_vehiculo_accidente AS ENUM (
    'AUTOMOVIL',
    'PICKUP',
    'CAMION',
    'BUS',
    'MOTOCICLETA',
    'BICICLETA',
    'PEATON',
    'TRAILER',
    'MAQUINARIA',
    'OTRO'
);


--
-- Name: activar_turno_del_dia(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.activar_turno_del_dia() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE turno
    SET estado = 'ACTIVO'
    WHERE fecha = CURRENT_DATE
      AND estado = 'PLANIFICADO';
END;
$$;


--
-- Name: FUNCTION activar_turno_del_dia(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.activar_turno_del_dia() IS 'Activa el turno del d??a actual. Ejecutar con cron a las 00:01';


--
-- Name: actualizar_ruta_activa(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.actualizar_ruta_activa(p_asignacion_id integer, p_nueva_ruta_id integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE asignacion_unidad
    SET
        ruta_activa_id = p_nueva_ruta_id,
        hora_ultima_actualizacion_ruta = NOW()
    WHERE id = p_asignacion_id;
END;
$$;


--
-- Name: FUNCTION actualizar_ruta_activa(p_asignacion_id integer, p_nueva_ruta_id integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.actualizar_ruta_activa(p_asignacion_id integer, p_nueva_ruta_id integer) IS 'Actualiza la ruta activa de una asignación (se llama en SALIDA_SEDE o CAMBIO_RUTA)';


--
-- Name: aprobar_inspeccion_360(integer, integer, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.aprobar_inspeccion_360(p_inspeccion_id integer, p_aprobador_id integer, p_firma text DEFAULT NULL::text, p_observaciones text DEFAULT NULL::text) RETURNS TABLE(success boolean, mensaje text)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_inspeccion RECORD;
    v_es_comandante BOOLEAN;
    v_salida_id INT;
BEGIN
    -- Obtener datos de la inspección
    SELECT i.*, s.unidad_id
    INTO v_inspeccion
    FROM inspeccion_360 i
    LEFT JOIN salida_unidad s ON i.salida_id = s.id
    WHERE i.id = p_inspeccion_id;

    IF v_inspeccion IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Inspección no encontrada'::TEXT;
        RETURN;
    END IF;

    IF v_inspeccion.estado != 'PENDIENTE' THEN
        RETURN QUERY SELECT FALSE, ('La inspección ya fue ' || v_inspeccion.estado)::TEXT;
        RETURN;
    END IF;

    -- Verificar que el aprobador sea comandante de la unidad
    SELECT EXISTS (
        SELECT 1 FROM brigada_unidad bu
        WHERE bu.brigada_id = p_aprobador_id
          AND bu.unidad_id = v_inspeccion.unidad_id
          AND bu.activo = TRUE
          AND bu.es_comandante = TRUE
        UNION
        SELECT 1 FROM tripulacion_turno tt
        JOIN asignacion_unidad au ON tt.asignacion_id = au.id
        WHERE tt.usuario_id = p_aprobador_id
          AND au.unidad_id = v_inspeccion.unidad_id
          AND tt.es_comandante = TRUE
    ) INTO v_es_comandante;

    IF NOT v_es_comandante THEN
        RETURN QUERY SELECT FALSE, 'Solo el comandante de la unidad puede aprobar la inspección'::TEXT;
        RETURN;
    END IF;

    -- Aprobar la inspección
    UPDATE inspeccion_360
    SET estado = 'APROBADA',
        aprobado_por = p_aprobador_id,
        fecha_aprobacion = NOW(),
        firma_comandante = COALESCE(p_firma, firma_comandante),
        observaciones_comandante = COALESCE(p_observaciones, observaciones_comandante)
    WHERE id = p_inspeccion_id;

    -- Actualizar la salida con la referencia a la inspección
    IF v_inspeccion.salida_id IS NOT NULL THEN
        UPDATE salida_unidad
        SET inspeccion_360_id = p_inspeccion_id
        WHERE id = v_inspeccion.salida_id;
    END IF;

    RETURN QUERY SELECT TRUE, 'Inspección aprobada exitosamente'::TEXT;
END;
$$;


--
-- Name: FUNCTION aprobar_inspeccion_360(p_inspeccion_id integer, p_aprobador_id integer, p_firma text, p_observaciones text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.aprobar_inspeccion_360(p_inspeccion_id integer, p_aprobador_id integer, p_firma text, p_observaciones text) IS 'Aprueba una inspección 360 (solo comandante)';


--
-- Name: archivar_inspecciones_360_antiguas(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.archivar_inspecciones_360_antiguas() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_count INTEGER := 0;
  v_inspeccion RECORD;
BEGIN
  -- Archivar inspecciones de mas de 90 dias
  FOR v_inspeccion IN
    SELECT id, unidad_id, fecha_realizacion, estado,
           jsonb_build_object(
             'plantilla_id', plantilla_id,
             'realizado_por', realizado_por,
             'aprobado_por', aprobado_por,
             'respuestas', respuestas,
             'observaciones_inspector', observaciones_inspector,
             'observaciones_comandante', observaciones_comandante
           ) as datos
    FROM inspeccion_360
    WHERE fecha_realizacion < CURRENT_DATE - INTERVAL '90 days'
      AND estado IN ('APROBADA', 'RECHAZADA') -- Solo archivamos las cerradas
  LOOP
    -- Insertar en archivo (datos como JSONB comprimido)
    INSERT INTO inspeccion_360_archivo (inspeccion_id, unidad_id, fecha_realizacion, estado, datos_comprimidos)
    VALUES (
      v_inspeccion.id,
      v_inspeccion.unidad_id,
      v_inspeccion.fecha_realizacion,
      v_inspeccion.estado,
      compress(v_inspeccion.datos::text::bytea)
    );
    
    -- Eliminar de tabla principal
    DELETE FROM inspeccion_360 WHERE id = v_inspeccion.id;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;


--
-- Name: FUNCTION archivar_inspecciones_360_antiguas(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.archivar_inspecciones_360_antiguas() IS 'Archiva inspecciones de mas de 90 dias para mantener la tabla principal ligera';


--
-- Name: atender_alerta(integer, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.atender_alerta(p_alerta_id integer, p_usuario_id integer, p_nota text DEFAULT NULL::text) RETURNS TABLE(success boolean, mensaje text)
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_alerta alerta;
BEGIN
  -- Obtener alerta
  SELECT * INTO v_alerta FROM alerta WHERE id = p_alerta_id;

  IF v_alerta IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Alerta no encontrada'::TEXT;
    RETURN;
  END IF;

  IF v_alerta.estado != 'ACTIVA' THEN
    RETURN QUERY SELECT FALSE, 'La alerta ya no está activa'::TEXT;
    RETURN;
  END IF;

  -- Actualizar alerta
  UPDATE alerta
  SET estado = 'ATENDIDA',
      atendida_por = p_usuario_id,
      fecha_atencion = CURRENT_TIMESTAMP,
      nota_resolucion = p_nota,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = p_alerta_id;

  RETURN QUERY SELECT TRUE, 'Alerta marcada como atendida'::TEXT;
END;
$$;


--
-- Name: FUNCTION atender_alerta(p_alerta_id integer, p_usuario_id integer, p_nota text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.atender_alerta(p_alerta_id integer, p_usuario_id integer, p_nota text) IS 'Marca una alerta como atendida';


--
-- Name: calcular_km_recorridos(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calcular_km_recorridos() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    km_inicial DECIMAL(6,2);
    km_minimo DECIMAL(6,2);
    km_maximo DECIMAL(6,2);
BEGIN
    -- Obtener km inicial de la asignaci??n
    SELECT a.km_inicio INTO km_inicial
    FROM asignacion_unidad a
    WHERE a.id = NEW.asignacion_id;

    -- Calcular km recorridos basado en reportes horarios
    SELECT
        MIN(rh.km_actual),
        MAX(rh.km_actual)
    INTO km_minimo, km_maximo
    FROM reporte_horario rh
    WHERE rh.asignacion_id = NEW.asignacion_id;

    -- Actualizar km recorridos en la asignaci??n
    UPDATE asignacion_unidad
    SET km_recorridos = COALESCE(ABS(km_maximo - km_minimo), 0)
    WHERE id = NEW.asignacion_id;

    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION calcular_km_recorridos(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.calcular_km_recorridos() IS 'Calcula autom??ticamente los km recorridos al agregar reporte horario';


--
-- Name: cerrar_actividad_anterior(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cerrar_actividad_anterior() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Cerrar cualquier actividad previa abierta de la misma unidad
    UPDATE actividad_unidad
    SET hora_fin = NEW.hora_inicio
    WHERE unidad_id = NEW.unidad_id
      AND hora_fin IS NULL
      AND id != COALESCE(NEW.id, 0);

    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION cerrar_actividad_anterior(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.cerrar_actividad_anterior() IS 'Cierra autom??ticamente la actividad anterior al iniciar una nueva para la misma unidad';


--
-- Name: cerrar_dia_operativo(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cerrar_dia_operativo() RETURNS TABLE(asignaciones_cerradas integer, situaciones_migradas integer)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_asignaciones_cerradas INT := 0;
    v_situaciones_migradas INT := 0;
    v_turno_ayer INT;
    v_turno_hoy INT;
    v_situacion RECORD;
BEGIN
    -- 1. Obtener turnos de ayer y hoy
    SELECT id INTO v_turno_ayer
    FROM turno
    WHERE fecha = CURRENT_DATE - INTERVAL '1 day';

    SELECT id INTO v_turno_hoy
    FROM turno
    WHERE fecha = CURRENT_DATE;

    -- Si no existe turno de hoy, crearlo autom??ticamente
    IF v_turno_hoy IS NULL THEN
        INSERT INTO turno (fecha, estado, observaciones, creado_por)
        VALUES (
            CURRENT_DATE,
            'ACTIVO',
            'Turno creado autom??ticamente por cierre de d??a',
            1  -- Usuario sistema
        )
        RETURNING id INTO v_turno_hoy;
    END IF;

    -- 2. Cerrar todas las asignaciones del d??a anterior
    UPDATE asignacion_unidad
    SET
        dia_cerrado = TRUE,
        fecha_cierre = NOW(),
        cerrado_por = 1  -- Usuario sistema
    WHERE turno_id = v_turno_ayer
      AND dia_cerrado = FALSE;

    GET DIAGNOSTICS v_asignaciones_cerradas = ROW_COUNT;

    -- 3. Cerrar todos los movimientos activos del d??a anterior
    UPDATE movimiento_brigada
    SET hora_fin = NOW()
    WHERE turno_id = v_turno_ayer
      AND hora_fin IS NULL;

    -- 4. Migrar situaciones activas al nuevo d??a
    FOR v_situacion IN
        SELECT *
        FROM situacion
        WHERE turno_id = v_turno_ayer
          AND estado = 'ACTIVA'
    LOOP
        -- Actualizar turno de la situaci??n
        UPDATE situacion
        SET turno_id = v_turno_hoy
        WHERE id = v_situacion.id;

        v_situaciones_migradas := v_situaciones_migradas + 1;
    END LOOP;

    RETURN QUERY SELECT v_asignaciones_cerradas, v_situaciones_migradas;
END;
$$;


--
-- Name: FUNCTION cerrar_dia_operativo(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.cerrar_dia_operativo() IS 'Cierra el d??a operativo a las 00:00: cierra asignaciones, movimientos y migra situaciones activas';


--
-- Name: cerrar_situaciones_antiguas(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cerrar_situaciones_antiguas(horas_limite integer DEFAULT 24) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    cantidad_cerradas INT;
BEGIN
    WITH cerradas AS (
        UPDATE situacion
        SET
            estado = 'CERRADA',
            actualizado_por = creado_por,
            updated_at = NOW()
        WHERE estado = 'ACTIVA'
          AND created_at < NOW() - (horas_limite || ' hours')::INTERVAL
        RETURNING id
    )
    SELECT COUNT(*) INTO cantidad_cerradas FROM cerradas;

    RETURN cantidad_cerradas;
END;
$$;


--
-- Name: FUNCTION cerrar_situaciones_antiguas(horas_limite integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.cerrar_situaciones_antiguas(horas_limite integer) IS 'Cierra autom??ticamente situaciones activas de m??s de X horas (default 24)';


--
-- Name: cerrar_turno(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cerrar_turno() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE turno
    SET estado = 'CERRADO'
    WHERE fecha < CURRENT_DATE
      AND estado = 'ACTIVO';
END;
$$;


--
-- Name: FUNCTION cerrar_turno(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.cerrar_turno() IS 'Cierra turnos de d??as anteriores. Ejecutar con cron a las 23:59';


--
-- Name: cleanup_expired_idempotency_keys(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_idempotency_keys() RETURNS integer
    LANGUAGE plpgsql
    AS $$
  DECLARE
    deleted_count INT;
  BEGIN
    DELETE FROM idempotency_keys WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
  END;
  $$;


--
-- Name: FUNCTION cleanup_expired_idempotency_keys(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.cleanup_expired_idempotency_keys() IS 'Elimina idempotency_keys expiradas (ejecutar diariamente)';


--
-- Name: contar_veces_en_ruta(integer, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.contar_veces_en_ruta(p_usuario_id integer, p_ruta_id integer, p_dias integer DEFAULT 30) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM historial_ruta_brigada
    WHERE usuario_id = p_usuario_id
      AND ruta_id = p_ruta_id
      AND fecha >= CURRENT_DATE - p_dias;

    RETURN v_count;
END;
$$;


--
-- Name: contar_veces_en_situacion(integer, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.contar_veces_en_situacion(p_usuario_id integer, p_situacion_fija_id integer, p_dias integer DEFAULT 30) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM historial_situacion_brigada
    WHERE usuario_id = p_usuario_id
      AND situacion_fija_id = p_situacion_fija_id
      AND fecha >= CURRENT_DATE - p_dias;

    RETURN v_count;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alerta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alerta (
    id integer NOT NULL,
    tipo public.tipo_alerta NOT NULL,
    severidad public.severidad_alerta DEFAULT 'MEDIA'::public.severidad_alerta NOT NULL,
    estado public.estado_alerta DEFAULT 'ACTIVA'::public.estado_alerta NOT NULL,
    titulo character varying(200) NOT NULL,
    mensaje text NOT NULL,
    datos jsonb,
    sede_id integer,
    unidad_id integer,
    brigada_id integer,
    situacion_id integer,
    atendida_por integer,
    fecha_atencion timestamp without time zone,
    nota_resolucion text,
    fecha_expiracion timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE alerta; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.alerta IS 'Alertas del sistema PROVIAL';


--
-- Name: crear_alerta(public.tipo_alerta, character varying, text, public.severidad_alerta, jsonb, integer, integer, integer, bigint, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.crear_alerta(p_tipo public.tipo_alerta, p_titulo character varying, p_mensaje text, p_severidad public.severidad_alerta DEFAULT NULL::public.severidad_alerta, p_datos jsonb DEFAULT NULL::jsonb, p_sede_id integer DEFAULT NULL::integer, p_unidad_id integer DEFAULT NULL::integer, p_brigada_id integer DEFAULT NULL::integer, p_situacion_id bigint DEFAULT NULL::bigint, p_expira_en_minutos integer DEFAULT NULL::integer) RETURNS public.alerta
    LANGUAGE plpgsql
    AS $$
  DECLARE
    v_config configuracion_alerta;
    v_alerta alerta;
    v_fecha_exp TIMESTAMP;
  BEGIN
    SELECT * INTO v_config FROM configuracion_alerta WHERE tipo = p_tipo;
    IF v_config IS NULL OR NOT v_config.activa THEN
      RETURN NULL;
    END IF;
    IF p_expira_en_minutos IS NOT NULL THEN
      v_fecha_exp := CURRENT_TIMESTAMP + (p_expira_en_minutos || ' minutes')::INTERVAL;
    END IF;
    INSERT INTO alerta (tipo, severidad, titulo, mensaje, datos, sede_id, unidad_id, brigada_id, situacion_id, fecha_expiracion)
    VALUES (p_tipo, COALESCE(p_severidad, v_config.severidad_default), p_titulo, p_mensaje, p_datos, p_sede_id, p_unidad_id, p_brigada_id,
  p_situacion_id::INTEGER, v_fecha_exp)
    RETURNING * INTO v_alerta;
    RETURN v_alerta;
  END;
  $$;


--
-- Name: crear_aprobacion_tripulacion(integer, character varying, integer, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.crear_aprobacion_tripulacion(p_salida_id integer, p_tipo character varying, p_iniciado_por integer, p_inspeccion_360_id integer DEFAULT NULL::integer, p_tiempo_limite integer DEFAULT 30) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_aprobacion_id INTEGER;
    v_unidad_id INTEGER;
    v_tripulante RECORD;
BEGIN
    -- Obtener unidad de la salida
    SELECT unidad_id INTO v_unidad_id
    FROM salida_unidad
    WHERE id = p_salida_id;

    IF v_unidad_id IS NULL THEN
        RAISE EXCEPTION 'Salida no encontrada: %', p_salida_id;
    END IF;

    -- Crear solicitud de aprobacion
    INSERT INTO aprobacion_tripulacion (
        salida_id, unidad_id, tipo, inspeccion_360_id,
        iniciado_por, tiempo_limite_minutos
    ) VALUES (
        p_salida_id, v_unidad_id, p_tipo, p_inspeccion_360_id,
        p_iniciado_por, p_tiempo_limite
    ) RETURNING id INTO v_aprobacion_id;

    -- Crear respuestas pendientes para cada tripulante
    FOR v_tripulante IN (
        SELECT tt.usuario_id
        FROM tripulacion_turno tt
        JOIN salida_unidad su ON su.asignacion_id = tt.asignacion_id
        WHERE su.id = p_salida_id
    ) LOOP
        INSERT INTO aprobacion_respuesta (aprobacion_id, usuario_id, respuesta)
        VALUES (v_aprobacion_id, v_tripulante.usuario_id, 'PENDIENTE');
    END LOOP;

    RETURN v_aprobacion_id;
END;
$$;


--
-- Name: crear_snapshot_bitacora(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.crear_snapshot_bitacora(p_salida_id integer, p_finalizado_por integer) RETURNS bigint
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_salida RECORD;
    v_situaciones JSONB;
    v_ingresos JSONB;
    v_tripulacion JSONB;
    v_contadores RECORD;
    v_bitacora_id BIGINT;
BEGIN
    -- Obtener datos de la salida
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

    -- Procesar tripulación - ES UN ARRAY, no un objeto
    -- Formato actual: [{"rol": "PILOTO", "brigada_id": 568, ...}, ...]
    -- Lo convertimos a: [{"usuario_id": X, "rol": "PILOTO"}, ...]
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
        COUNT(*) FILTER (WHERE tipo_situacion = 'INCIDENTE') as incidentes,
        COUNT(*) FILTER (WHERE tipo_situacion = 'ASISTENCIA') as asistencias,
        COUNT(*) FILTER (WHERE tipo_situacion = 'EMERGENCIA') as emergencias,
        COUNT(*) FILTER (WHERE tipo_situacion IN ('REGULACION', 'REGULACION_TRANSITO')) as regulaciones,
        COUNT(*) FILTER (WHERE tipo_situacion = 'PATRULLAJE') as patrullajes,
        COUNT(*) as total
    INTO v_contadores
    FROM situacion
    WHERE salida_unidad_id = p_salida_id;

    -- Insertar en bitacora_historica
    INSERT INTO bitacora_historica (
        fecha,
        unidad_id,
        salida_id,
        sede_origen_id,
        ruta_inicial_id,
        km_inicial,
        km_final,
        km_recorridos,
        combustible_inicial,
        combustible_final,
        hora_inicio,
        hora_fin,
        duracion_minutos,
        tripulacion_ids,
        situaciones_resumen,
        total_situaciones,
        ingresos_resumen,
        total_ingresos,
        total_incidentes,
        total_asistencias,
        total_emergencias,
        total_regulaciones,
        total_patrullajes,
        observaciones_inicio,
        observaciones_fin,
        finalizado_por
    ) VALUES (
        v_salida.fecha_jornada,
        v_salida.unidad_id,
        p_salida_id,
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
        salida_id = EXCLUDED.salida_id,
        km_final = EXCLUDED.km_final,
        km_recorridos = EXCLUDED.km_recorridos,
        combustible_final = EXCLUDED.combustible_final,
        hora_fin = EXCLUDED.hora_fin,
        duracion_minutos = EXCLUDED.duracion_minutos,
        situaciones_resumen = EXCLUDED.situaciones_resumen,
        total_situaciones = EXCLUDED.total_situaciones,
        ingresos_resumen = EXCLUDED.ingresos_resumen,
        total_ingresos = EXCLUDED.total_ingresos,
        total_incidentes = EXCLUDED.total_incidentes,
        total_asistencias = EXCLUDED.total_asistencias,
        total_emergencias = EXCLUDED.total_emergencias,
        total_regulaciones = EXCLUDED.total_regulaciones,
        total_patrullajes = EXCLUDED.total_patrullajes,
        observaciones_fin = EXCLUDED.observaciones_fin,
        finalizado_por = EXCLUDED.finalizado_por
    RETURNING id INTO v_bitacora_id;

    RETURN v_bitacora_id;
END;
$$;


--
-- Name: FUNCTION crear_snapshot_bitacora(p_salida_id integer, p_finalizado_por integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.crear_snapshot_bitacora(p_salida_id integer, p_finalizado_por integer) IS 'Crea un snapshot de la jornada en bitacora_historica antes de limpiar datos operacionales';


--
-- Name: finalizar_jornada_completa(integer, numeric, numeric, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.finalizar_jornada_completa(p_salida_id integer, p_km_final numeric DEFAULT NULL::numeric, p_combustible_final numeric DEFAULT NULL::numeric, p_observaciones text DEFAULT NULL::text, p_finalizada_por integer DEFAULT NULL::integer) RETURNS TABLE(success boolean, bitacora_id bigint, mensaje text)
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: FUNCTION finalizar_jornada_completa(p_salida_id integer, p_km_final numeric, p_combustible_final numeric, p_observaciones text, p_finalizada_por integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.finalizar_jornada_completa(p_salida_id integer, p_km_final numeric, p_combustible_final numeric, p_observaciones text, p_finalizada_por integer) IS 'Finaliza jornada: crea bitácora, elimina situaciones temporales (patrullaje, comida, etc.),
mantiene situaciones persistentes (incidentes, asistencias, emergencias) para análisis de reincidencias';


--
-- Name: finalizar_salida_unidad(integer, numeric, numeric, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.finalizar_salida_unidad(p_salida_id integer, p_km_final numeric DEFAULT NULL::numeric, p_combustible_final numeric DEFAULT NULL::numeric, p_observaciones text DEFAULT NULL::text, p_finalizada_por integer DEFAULT NULL::integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_km_inicial DECIMAL;
    v_km_recorridos DECIMAL;
BEGIN
    -- Obtener km inicial
    SELECT km_inicial INTO v_km_inicial
    FROM salida_unidad
    WHERE id = p_salida_id;

    -- Calcular km recorridos
    IF p_km_final IS NOT NULL AND v_km_inicial IS NOT NULL THEN
        v_km_recorridos := ABS(p_km_final - v_km_inicial);
    END IF;

    -- Finalizar salida
    UPDATE salida_unidad
    SET estado = 'FINALIZADA',
        fecha_hora_regreso = NOW(),
        km_final = p_km_final,
        combustible_final = p_combustible_final,
        km_recorridos = v_km_recorridos,
        observaciones_regreso = p_observaciones,
        finalizada_por = p_finalizada_por
    WHERE id = p_salida_id
      AND estado = 'EN_SALIDA';

    RETURN FOUND;
END;
$$;


--
-- Name: FUNCTION finalizar_salida_unidad(p_salida_id integer, p_km_final numeric, p_combustible_final numeric, p_observaciones text, p_finalizada_por integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.finalizar_salida_unidad(p_salida_id integer, p_km_final numeric, p_combustible_final numeric, p_observaciones text, p_finalizada_por integer) IS 'Finaliza una salida activa. Calcula km recorridos autom??ticamente.';


--
-- Name: fn_actualizar_situacion_actual(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_actualizar_situacion_actual() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_ruta_codigo VARCHAR(20);
BEGIN
    -- Obtener c¢digo de ruta
    SELECT codigo INTO v_ruta_codigo
    FROM ruta
    WHERE id = NEW.ruta_id;

    -- UPSERT: insertar o actualizar
    INSERT INTO situacion_actual (
        unidad_id,
        situacion_id,
        tipo_situacion,
        estado,
        latitud,
        longitud,
        km,
        sentido,
        ruta_id,
        ruta_codigo,
        situacion_created_at,
        updated_at
    ) VALUES (
        NEW.unidad_id,
        NEW.id,
        NEW.tipo_situacion,
        NEW.estado,
        NEW.latitud,
        NEW.longitud,
        NEW.km,
        NEW.sentido,
        NEW.ruta_id,
        v_ruta_codigo,
        NEW.created_at,
        NOW()
    )
    ON CONFLICT (unidad_id) DO UPDATE SET
        situacion_id = EXCLUDED.situacion_id,
        tipo_situacion = EXCLUDED.tipo_situacion,
        estado = EXCLUDED.estado,
        latitud = EXCLUDED.latitud,
        longitud = EXCLUDED.longitud,
        km = EXCLUDED.km,
        sentido = EXCLUDED.sentido,
        ruta_id = EXCLUDED.ruta_id,
        ruta_codigo = EXCLUDED.ruta_codigo,
        situacion_created_at = EXCLUDED.situacion_created_at,
        updated_at = NOW();

    RETURN NEW;
END;
$$;


--
-- Name: fn_actualizar_situacion_actual_actividad(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_actualizar_situacion_actual_actividad() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_nombre_actividad TEXT;
    v_icono TEXT; -- <--- Nueva variable
BEGIN
    -- Jalamos nombre e icono del cat logo
    SELECT nombre, icono INTO v_nombre_actividad, v_icono 
    FROM catalogo_tipo_situacion 
    WHERE id = NEW.tipo_actividad_id;

    UPDATE situacion_actual 
    SET 
        situacion_id = NULL,
        tipo_situacion = NULL,
        actividad_id = NEW.id,
        actividad_tipo_nombre = v_nombre_actividad,
        icono = v_icono, -- <--- Guardamos el icono aqu¡
        estado = NEW.estado,
        latitud = NEW.latitud,
        longitud = NEW.longitud,
        updated_at = NOW()
    WHERE unidad_id = NEW.unidad_id;

    IF NOT FOUND THEN
        INSERT INTO situacion_actual (unidad_id, icono, actividad_id, actividad_tipo_nombre, latitud, longitud, updated_at)
        VALUES (NEW.unidad_id, v_icono, NEW.id, v_nombre_actividad, NEW.latitud, NEW.longitud, NOW());
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: fn_asignar_encargado(integer, integer, smallint, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_asignar_encargado(p_usuario_id integer, p_sede_id integer, p_grupo smallint, p_asignado_por integer, p_motivo text DEFAULT 'Asignacion de encargado'::text) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_encargado_anterior_id INTEGER;
    v_nuevo_id INTEGER;
BEGIN
    -- Verificar que el usuario existe y esta activo
    IF NOT EXISTS (SELECT 1 FROM usuario WHERE id = p_usuario_id AND activo = TRUE) THEN
        RAISE EXCEPTION 'El usuario no existe o no esta activo';
    END IF;

    -- Verificar que la sede existe y esta activa
    IF NOT EXISTS (SELECT 1 FROM sede WHERE id = p_sede_id AND activa = TRUE) THEN
        RAISE EXCEPTION 'La sede no existe o no esta activa';
    END IF;

    -- Cerrar encargado anterior si existe
    UPDATE historial_encargado_sede_grupo
    SET fecha_fin = CURRENT_DATE,
        removido_por = p_asignado_por,
        motivo_remocion = 'Reemplazado por nuevo encargado'
    WHERE sede_id = p_sede_id
      AND grupo = p_grupo
      AND fecha_fin IS NULL
    RETURNING usuario_id INTO v_encargado_anterior_id;

    -- Quitar flag de encargado al anterior (si no tiene otras asignaciones)
    IF v_encargado_anterior_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM historial_encargado_sede_grupo
            WHERE usuario_id = v_encargado_anterior_id
              AND fecha_fin IS NULL
              AND id != (SELECT id FROM historial_encargado_sede_grupo
                         WHERE usuario_id = v_encargado_anterior_id
                           AND sede_id = p_sede_id
                           AND grupo = p_grupo
                         ORDER BY id DESC LIMIT 1)
        ) THEN
            UPDATE usuario SET es_encargado_grupo = FALSE WHERE id = v_encargado_anterior_id;
        END IF;
    END IF;

    -- Crear nuevo registro
    INSERT INTO historial_encargado_sede_grupo (
        usuario_id, sede_id, grupo, asignado_por, motivo_asignacion
    )
    VALUES (p_usuario_id, p_sede_id, p_grupo, p_asignado_por, p_motivo)
    RETURNING id INTO v_nuevo_id;

    -- Marcar usuario como encargado
    UPDATE usuario SET es_encargado_grupo = TRUE WHERE id = p_usuario_id;

    RETURN v_nuevo_id;
END;
$$;


--
-- Name: fn_brigada_to_usuario(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_brigada_to_usuario(p_brigada_id integer) RETURNS integer
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_usuario_id INT;
BEGIN
    -- Primero buscar en la relaciÃ³n directa
    SELECT usuario_id INTO v_usuario_id FROM brigada WHERE id = p_brigada_id;
    
    -- Si no hay relaciÃ³n directa, buscar por chapa
    IF v_usuario_id IS NULL THEN
        SELECT u.id INTO v_usuario_id 
        FROM brigada b
        JOIN usuario u ON u.chapa = b.codigo
        WHERE b.id = p_brigada_id
        LIMIT 1;
    END IF;
    
    RETURN v_usuario_id;
END;
$$;


--
-- Name: FUNCTION fn_brigada_to_usuario(p_brigada_id integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_brigada_to_usuario(p_brigada_id integer) IS 'Convierte brigada_id a usuario_id. Para migraciÃ³n gradual de FKs.';


--
-- Name: fn_generar_descripcion_obstruccion(boolean, character varying, jsonb, jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_generar_descripcion_obstruccion(p_hay_vehiculo_fuera boolean, p_tipo_obstruccion character varying, p_sentido_principal jsonb, p_sentido_contrario jsonb, p_sentido_situacion text DEFAULT NULL::text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    v_desc TEXT := '';
    v_carril RECORD;
    v_carriles_afectados TEXT := '';
BEGIN
    -- Veh??culo fuera de v??a
    IF p_hay_vehiculo_fuera THEN
        v_desc := 'Vehiculo fuera de la via';
        IF p_tipo_obstruccion != 'ninguna' THEN
            v_desc := v_desc || '. Ademas, ';
        END IF;
    END IF;

    -- Tipo de obstrucci??n
    CASE p_tipo_obstruccion
        WHEN 'ninguna' THEN
            IF NOT p_hay_vehiculo_fuera THEN
                v_desc := 'Sin obstruccion de via';
            END IF;

        WHEN 'total_sentido' THEN
            v_desc := v_desc || 'Obstruccion total del sentido ' || COALESCE(p_sentido_situacion, 'principal');

        WHEN 'total_ambos' THEN
            v_desc := v_desc || 'Obstruccion total de ambos sentidos (via cerrada)';

        WHEN 'parcial' THEN
            -- Construir descripci??n de carriles afectados
            IF p_sentido_principal IS NOT NULL AND p_sentido_principal->'carriles' IS NOT NULL THEN
                FOR v_carril IN
                    SELECT
                        (value->>'nombre')::TEXT as nombre,
                        (value->>'porcentaje')::INT as porcentaje
                    FROM jsonb_array_elements(p_sentido_principal->'carriles')
                    WHERE (value->>'porcentaje')::INT > 0
                LOOP
                    IF v_carriles_afectados != '' THEN
                        v_carriles_afectados := v_carriles_afectados || ', ';
                    END IF;
                    v_carriles_afectados := v_carriles_afectados || v_carril.nombre || ' (' || v_carril.porcentaje || '%)';
                END LOOP;
            END IF;

            IF v_carriles_afectados != '' THEN
                v_desc := v_desc || 'Obstruccion parcial: ' || v_carriles_afectados;
            ELSE
                v_desc := v_desc || 'Obstruccion parcial sin carriles especificados';
            END IF;
    END CASE;

    RETURN v_desc;
END;
$$;


--
-- Name: FUNCTION fn_generar_descripcion_obstruccion(p_hay_vehiculo_fuera boolean, p_tipo_obstruccion character varying, p_sentido_principal jsonb, p_sentido_contrario jsonb, p_sentido_situacion text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_generar_descripcion_obstruccion(p_hay_vehiculo_fuera boolean, p_tipo_obstruccion character varying, p_sentido_principal jsonb, p_sentido_contrario jsonb, p_sentido_situacion text) IS 'Genera descripci??n autom??tica de obstrucci??n basada en los datos';


--
-- Name: fn_generar_id_situacion(date, integer, character varying, integer, integer, numeric, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_generar_id_situacion(p_fecha date, p_sede_id integer, p_unidad_codigo character varying, p_tipo_situacion_id integer, p_ruta_id integer, p_km numeric, p_num_situacion_salida integer) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
    RETURN TO_CHAR(p_fecha, 'YYYYMMDD') || '-' ||
           COALESCE(p_sede_id::TEXT, '0') || '-' ||
           COALESCE(p_unidad_codigo, '000') || '-' ||
           COALESCE(p_tipo_situacion_id::TEXT, '0') || '-' ||
           COALESCE(p_ruta_id::TEXT, '0') || '-' ||
           COALESCE(FLOOR(p_km)::TEXT, '0') || '-' ||
           COALESCE(p_num_situacion_salida::TEXT, '0');
END;
$$;


--
-- Name: fn_generar_id_situacion_persistente(date, integer, numeric, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_generar_id_situacion_persistente(p_fecha date, p_ruta_id integer, p_km numeric, p_num_anual integer) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
    -- Formato: NUM-YYYYMMDD-RUTA-KM
    RETURN p_num_anual::TEXT || '-' ||
           TO_CHAR(p_fecha, 'YYYYMMDD') || '-' ||
           COALESCE(p_ruta_id::TEXT, '0') || '-' ||
           COALESCE(FLOOR(p_km)::TEXT, '0');
END;
$$;


--
-- Name: fn_generar_numero_boleta(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_generar_numero_boleta(p_sede_id integer) RETURNS TABLE(numero text, secuencia integer)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_codigo_sede VARCHAR(10);
    v_anio INT;
    v_secuencia INT;
    v_numero_boleta TEXT;
BEGIN
    -- Obtener código de sede
    SELECT codigo_boleta INTO v_codigo_sede FROM sede WHERE id = p_sede_id;
    
    IF v_codigo_sede IS NULL THEN
        RAISE EXCEPTION 'Sede % no tiene codigo_boleta definido', p_sede_id;
    END IF;
    
    -- Año actual
    v_anio := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
    
    -- Obtener siguiente secuencia con lock a nivel de fila
    SELECT COALESCE(MAX(numero_boleta_secuencia), 0) + 1
    INTO v_secuencia
    FROM incidente
    WHERE numero_boleta LIKE v_codigo_sede || '-' || v_anio || '-%'
    FOR UPDATE;
    
    -- Formatear
    v_numero_boleta := v_codigo_sede || '-' || v_anio || '-' || LPAD(v_secuencia::TEXT, 4, '0');
    
    RETURN QUERY SELECT v_numero_boleta, v_secuencia;
END;
$$;


--
-- Name: FUNCTION fn_generar_numero_boleta(p_sede_id integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_generar_numero_boleta(p_sede_id integer) IS 'Genera número y secuencia de boleta. Usar dentro de transacción.';


--
-- Name: fn_generar_numero_boleta(integer, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_generar_numero_boleta(p_sede_id integer, p_fecha timestamp with time zone) RETURNS TABLE(numero text, secuencia integer)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_codigo_sede VARCHAR(10);
    v_anio INT;
    v_secuencia INT;
BEGIN
    -- Obtener cÃ³digo de sede
    SELECT codigo_boleta INTO v_codigo_sede FROM sede WHERE id = p_sede_id;
    
    IF v_codigo_sede IS NULL THEN
        RAISE EXCEPTION 'Sede % no tiene codigo_boleta definido', p_sede_id;
    END IF;
    
    -- Usar aÃ±o de la fecha del incidente (no CURRENT_DATE)
    v_anio := EXTRACT(YEAR FROM COALESCE(p_fecha, CURRENT_TIMESTAMP))::INT;
    
    -- UPSERT atÃ³mico
    INSERT INTO boleta_secuencia (sede_id, anio, ultimo)
    VALUES (p_sede_id, v_anio, 1)
    ON CONFLICT (sede_id, anio)
    DO UPDATE SET ultimo = boleta_secuencia.ultimo + 1
    RETURNING ultimo INTO v_secuencia;
    
    -- Formatear
    numero := v_codigo_sede || '-' || v_anio || '-' || LPAD(v_secuencia::TEXT, 4, '0');
    secuencia := v_secuencia;
    
    RETURN NEXT;
END;
$$;


--
-- Name: FUNCTION fn_generar_numero_boleta(p_sede_id integer, p_fecha timestamp with time zone); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_generar_numero_boleta(p_sede_id integer, p_fecha timestamp with time zone) IS 'Genera nÃºmero de boleta atÃ³mico. Usa aÃ±o de la fecha proporcionada.';


--
-- Name: fn_get_num_anual_sp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_num_anual_sp() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_current_year INTEGER;
    v_last_year INTEGER;
    v_next_val INTEGER;
BEGIN
    v_current_year := EXTRACT(YEAR FROM CURRENT_DATE);

    SELECT EXTRACT(YEAR FROM fecha_inicio)::INTEGER INTO v_last_year
    FROM situacion_persistente
    ORDER BY id DESC
    LIMIT 1;

    IF v_last_year IS NULL OR v_last_year < v_current_year THEN
        PERFORM SETVAL('seq_situacion_persistente_anual', 1, FALSE);
    END IF;

    RETURN NEXTVAL('seq_situacion_persistente_anual');
END;
$$;


--
-- Name: fn_get_num_situacion_salida(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_num_situacion_salida(p_salida_unidad_id integer) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) + 1 INTO v_count
    FROM situacion
    WHERE salida_unidad_id = p_salida_unidad_id;
    RETURN v_count;
END;
$$;


--
-- Name: fn_inicializar_ubicacion_brigada(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_inicializar_ubicacion_brigada() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Cuando se agrega un tripulante a una asignación, crear su registro de ubicación
    INSERT INTO ubicacion_brigada (
        usuario_id,
        asignacion_origen_id,
        unidad_origen_id,
        unidad_actual_id,
        asignacion_actual_id,
        estado,
        creado_por
    )
    SELECT
        NEW.usuario_id,
        NEW.asignacion_id,
        a.unidad_id,
        a.unidad_id,
        NEW.asignacion_id,
        'CON_UNIDAD',
        NEW.usuario_id
    FROM asignacion_unidad a
    WHERE a.id = NEW.asignacion_id
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$;


--
-- Name: fn_limpiar_situacion_actual_unidad(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_limpiar_situacion_actual_unidad(p_unidad_id integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM situacion_actual WHERE unidad_id = p_unidad_id;
END;
$$;


--
-- Name: fn_nombres_carriles(integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_nombres_carriles(p_cantidad integer, p_sentido text DEFAULT NULL::text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
    CASE p_cantidad
        WHEN 1 THEN
            RETURN ARRAY['Carril hacia ' || COALESCE(p_sentido, 'el sentido')];
        WHEN 2 THEN
            RETURN ARRAY['Carril izquierdo', 'Carril derecho'];
        WHEN 3 THEN
            RETURN ARRAY['Carril izquierdo', 'Carril central', 'Carril derecho'];
        WHEN 4 THEN
            RETURN ARRAY['Carril izquierdo', 'Carril central izquierdo', 'Carril central derecho', 'Carril derecho'];
        WHEN 5 THEN
            RETURN ARRAY['Carril izquierdo', 'Carril central izquierdo', 'Carril central', 'Carril central derecho', 'Carril derecho'];
        ELSE
            RETURN ARRAY[]::TEXT[];
    END CASE;
END;
$$;


--
-- Name: FUNCTION fn_nombres_carriles(p_cantidad integer, p_sentido text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_nombres_carriles(p_cantidad integer, p_sentido text) IS 'Devuelve array de nombres de carriles seg??n la cantidad (1-5)';


--
-- Name: fn_promover_a_persistente(integer, character varying, integer, character varying, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_promover_a_persistente(p_situacion_id integer, p_titulo character varying, p_tipo_emergencia_id integer, p_importancia character varying, p_descripcion text, p_promovido_por integer) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_situacion RECORD;
    v_nueva_id INTEGER;
    v_numero VARCHAR(20);
BEGIN
    -- Obtener datos de la situacion original
    SELECT s.*, r.codigo as ruta_codigo
    INTO v_situacion
    FROM situacion s
    LEFT JOIN ruta r ON s.ruta_id = r.id
    WHERE s.id = p_situacion_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Situacion no encontrada: %', p_situacion_id;
    END IF;

    -- Verificar que no haya sido promovida antes
    IF EXISTS (
        SELECT 1 FROM situacion_persistente
        WHERE situacion_origen_id = p_situacion_id
    ) THEN
        RAISE EXCEPTION 'Esta situacion ya fue promovida a persistente anteriormente';
    END IF;

    -- Generar numero de situacion persistente
    SELECT 'SP-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
           LPAD((COALESCE(MAX(CAST(SUBSTRING(numero FROM 9) AS INTEGER)), 0) + 1)::TEXT, 4, '0')
    INTO v_numero
    FROM situacion_persistente
    WHERE numero LIKE 'SP-' || TO_CHAR(NOW(), 'YYYY') || '-%';

    -- Crear situacion persistente
    INSERT INTO situacion_persistente (
        numero,
        titulo,
        tipo,
        tipo_emergencia_id,
        importancia,
        ruta_id,
        km_inicio,
        sentido,
        latitud,
        longitud,
        descripcion,
        estado,
        situacion_origen_id,
        es_promocion,
        fecha_promocion,
        promovido_por,
        creado_por,
        fecha_inicio
    ) VALUES (
        v_numero,
        COALESCE(p_titulo, 'Emergencia promovida - ' || COALESCE(v_situacion.ruta_codigo, 'Sin ruta')),
        COALESCE((SELECT codigo FROM tipo_emergencia_vial WHERE id = p_tipo_emergencia_id), 'OTRO'),
        p_tipo_emergencia_id,
        COALESCE(p_importancia, 'ALTA'),
        v_situacion.ruta_id,
        v_situacion.km,
        v_situacion.sentido,
        v_situacion.latitud,
        v_situacion.longitud,
        p_descripcion,
        'ACTIVA',
        p_situacion_id,
        TRUE,
        NOW(),
        p_promovido_por,
        p_promovido_por,
        NOW()
    ) RETURNING id INTO v_nueva_id;

    -- Asignar automaticamente la unidad que reporto la situacion
    IF v_situacion.unidad_id IS NOT NULL THEN
        INSERT INTO asignacion_situacion_persistente (
            situacion_persistente_id,
            unidad_id,
            km_asignacion,
            latitud_asignacion,
            longitud_asignacion,
            asignado_por,
            fecha_hora_asignacion
        ) VALUES (
            v_nueva_id,
            v_situacion.unidad_id,
            v_situacion.km,
            v_situacion.latitud,
            v_situacion.longitud,
            p_promovido_por,
            NOW()
        );
    END IF;

    -- Registrar en actualizaciones
    INSERT INTO actualizacion_situacion_persistente (
        situacion_persistente_id,
        usuario_id,
        unidad_id,
        tipo_actualizacion,
        contenido,
        fecha_hora
    ) VALUES (
        v_nueva_id,
        p_promovido_por,
        v_situacion.unidad_id,
        'CREACION',
        'Situacion promovida desde situacion normal #' || p_situacion_id,
        NOW()
    );

    RETURN v_nueva_id;
END;
$$;


--
-- Name: FUNCTION fn_promover_a_persistente(p_situacion_id integer, p_titulo character varying, p_tipo_emergencia_id integer, p_importancia character varying, p_descripcion text, p_promovido_por integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_promover_a_persistente(p_situacion_id integer, p_titulo character varying, p_tipo_emergencia_id integer, p_importancia character varying, p_descripcion text, p_promovido_por integer) IS 'Promueve una situacion normal a persistente extraordinaria, creando registro vinculado y asignando unidad automaticamente';


--
-- Name: fn_remover_encargado(integer, smallint, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_remover_encargado(p_sede_id integer, p_grupo smallint, p_removido_por integer, p_motivo text DEFAULT 'Removido manualmente'::text) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_usuario_id INTEGER;
BEGIN
    -- Cerrar asignacion actual
    UPDATE historial_encargado_sede_grupo
    SET fecha_fin = CURRENT_DATE,
        removido_por = p_removido_por,
        motivo_remocion = p_motivo
    WHERE sede_id = p_sede_id
      AND grupo = p_grupo
      AND fecha_fin IS NULL
    RETURNING usuario_id INTO v_usuario_id;

    IF v_usuario_id IS NOT NULL THEN
        -- Verificar si tiene otras asignaciones activas
        IF NOT EXISTS (
            SELECT 1 FROM historial_encargado_sede_grupo
            WHERE usuario_id = v_usuario_id AND fecha_fin IS NULL
        ) THEN
            UPDATE usuario SET es_encargado_grupo = FALSE WHERE id = v_usuario_id;
        END IF;
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;


--
-- Name: fn_verificar_acceso_grupo(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_verificar_acceso_grupo(p_usuario_id integer) RETURNS TABLE(tiene_acceso boolean, motivo text)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_usuario RECORD;
    v_depto_codigo TEXT;
    v_estado_grupo BOOLEAN;
BEGIN
    -- Obtener datos del usuario
    SELECT u.*, r.nombre AS rol_codigo
    INTO v_usuario
    FROM usuario u
    JOIN rol r ON r.id = u.rol_id
    WHERE u.id = p_usuario_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Usuario no encontrado'::TEXT;
        RETURN;
    END IF;

    -- Verificar si esta activo
    IF NOT v_usuario.activo THEN
        RETURN QUERY SELECT FALSE, 'Usuario desactivado'::TEXT;
        RETURN;
    END IF;

    -- Verificar acceso a app
    IF NOT COALESCE(v_usuario.acceso_app_activo, TRUE) THEN
        RETURN QUERY SELECT FALSE, 'Acceso a app desactivado'::TEXT;
        RETURN;
    END IF;

    -- Si esta exento de grupos, tiene acceso
    IF COALESCE(v_usuario.exento_grupos, FALSE) THEN
        RETURN QUERY SELECT TRUE, 'Exento de sistema de grupos'::TEXT;
        RETURN;
    END IF;

    -- Si no tiene grupo asignado, no tiene acceso
    IF v_usuario.grupo IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Sin grupo asignado'::TEXT;
        RETURN;
    END IF;

    -- Determinar departamento basado en rol
    v_depto_codigo := v_usuario.rol_codigo;

    -- Verificar estado del grupo para este departamento y sede
    SELECT egd.activo INTO v_estado_grupo
    FROM estado_grupo_departamento egd
    JOIN departamento_sistema ds ON ds.id = egd.departamento_id
    WHERE ds.codigo = v_depto_codigo
      AND egd.sede_id = v_usuario.sede_id
      AND egd.grupo = v_usuario.grupo;

    -- Si no hay registro, asumimos activo por defecto
    IF NOT FOUND THEN
        v_estado_grupo := TRUE;
    END IF;

    IF v_estado_grupo THEN
        RETURN QUERY SELECT TRUE, 'Acceso permitido'::TEXT;
    ELSE
        RETURN QUERY SELECT FALSE, 'Grupo desactivado para tu departamento/sede'::TEXT;
    END IF;

    RETURN;
END;
$$;


--
-- Name: generar_calendario_grupos(date, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generar_calendario_grupos(p_fecha_inicio date, p_fecha_fin date) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_fecha DATE;
    v_dias_transcurridos INT;
    v_estado_grupo1 VARCHAR(20);
    v_estado_grupo2 VARCHAR(20);
    v_registros_creados INT := 0;
BEGIN
    v_fecha := p_fecha_inicio;

    WHILE v_fecha <= p_fecha_fin LOOP
        v_dias_transcurridos := v_fecha - DATE '2025-01-01';

        IF MOD(v_dias_transcurridos, 16) < 8 THEN
            v_estado_grupo1 := 'TRABAJO';
            v_estado_grupo2 := 'DESCANSO';
        ELSE
            v_estado_grupo1 := 'DESCANSO';
            v_estado_grupo2 := 'TRABAJO';
        END IF;

        INSERT INTO calendario_grupo (grupo, fecha, estado, creado_por)
        VALUES (1, v_fecha, v_estado_grupo1, 1)
        ON CONFLICT (grupo, fecha) DO NOTHING;

        INSERT INTO calendario_grupo (grupo, fecha, estado, creado_por)
        VALUES (2, v_fecha, v_estado_grupo2, 1)
        ON CONFLICT (grupo, fecha) DO NOTHING;

        v_registros_creados := v_registros_creados + 2;
        v_fecha := v_fecha + INTERVAL '1 day';
    END LOOP;

    RETURN v_registros_creados;
END;
$$;


--
-- Name: FUNCTION generar_calendario_grupos(p_fecha_inicio date, p_fecha_fin date); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.generar_calendario_grupos(p_fecha_inicio date, p_fecha_fin date) IS 'Genera calendario de trabajo/descanso para ambos grupos en un rango de fechas';


--
-- Name: generar_mensaje_plantilla(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generar_mensaje_plantilla(p_plantilla_id integer, p_situacion_id integer) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_plantilla TEXT;
  v_mensaje TEXT;
  v_situacion RECORD;
  v_accidente RECORD;
  v_heridos INTEGER;
  v_fallecidos INTEGER;
  v_vehiculos INTEGER;
BEGIN
  -- Obtener plantilla
  SELECT contenido_plantilla INTO v_plantilla
  FROM plantilla_comunicacion
  WHERE id = p_plantilla_id;

  IF v_plantilla IS NULL THEN
    RETURN NULL;
  END IF;

  -- Obtener datos de la situación
  SELECT
    s.*,
    m.nombre AS municipio_nombre,
    d.nombre AS departamento_nombre
  INTO v_situacion
  FROM situacion s
  LEFT JOIN municipio m ON s.municipio_id = m.id
  LEFT JOIN departamento d ON m.departamento_id = d.id
  WHERE s.id = p_situacion_id;

  -- Obtener datos de accidentología si existe
  SELECT * INTO v_accidente
  FROM hoja_accidentologia
  WHERE situacion_id = p_situacion_id;

  -- Contar personas afectadas
  IF v_accidente IS NOT NULL THEN
    SELECT
      COUNT(*) FILTER (WHERE estado IN ('HERIDO_LEVE', 'HERIDO_MODERADO', 'HERIDO_GRAVE')),
      COUNT(*) FILTER (WHERE estado = 'FALLECIDO'),
      COUNT(DISTINCT vehiculo_accidente_id)
    INTO v_heridos, v_fallecidos, v_vehiculos
    FROM persona_accidente
    WHERE hoja_accidentologia_id = v_accidente.id;
  ELSE
    v_heridos := 0;
    v_fallecidos := 0;
    v_vehiculos := 0;
  END IF;

  -- Reemplazar variables
  v_mensaje := v_plantilla;
  v_mensaje := REPLACE(v_mensaje, '{fecha}', TO_CHAR(v_situacion.created_at, 'DD/MM/YYYY'));
  v_mensaje := REPLACE(v_mensaje, '{hora}', TO_CHAR(v_situacion.created_at, 'HH24:MI'));
  v_mensaje := REPLACE(v_mensaje, '{ubicacion}', COALESCE(CONCAT(v_situacion.km, ' km ', v_situacion.sentido), 'ubicación no especificada'));
  v_mensaje := REPLACE(v_mensaje, '{municipio}', COALESCE(v_situacion.municipio_nombre, ''));
  v_mensaje := REPLACE(v_mensaje, '{departamento}', COALESCE(v_situacion.departamento_nombre, ''));
  v_mensaje := REPLACE(v_mensaje, '{tipo}', v_situacion.tipo_situacion::TEXT);
  v_mensaje := REPLACE(v_mensaje, '{descripcion}', COALESCE(v_situacion.descripcion, ''));
  v_mensaje := REPLACE(v_mensaje, '{heridos}', v_heridos::TEXT);
  v_mensaje := REPLACE(v_mensaje, '{fallecidos}', v_fallecidos::TEXT);
  v_mensaje := REPLACE(v_mensaje, '{vehiculos}', v_vehiculos::TEXT);

  IF v_accidente IS NOT NULL THEN
    v_mensaje := REPLACE(v_mensaje, '{tipo_accidente}', v_accidente.tipo_accidente::TEXT);
    v_mensaje := REPLACE(v_mensaje, '{km}', COALESCE(v_accidente.kilometro::TEXT, ''));
  END IF;

  RETURN v_mensaje;
END;
$$;


--
-- Name: FUNCTION generar_mensaje_plantilla(p_plantilla_id integer, p_situacion_id integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.generar_mensaje_plantilla(p_plantilla_id integer, p_situacion_id integer) IS 'Genera mensaje de comunicación social desde plantilla';


--
-- Name: get_motivo_inactividad_actual(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_motivo_inactividad_actual(p_usuario_id integer) RETURNS TABLE(motivo_codigo character varying, motivo_nombre character varying, fecha_inicio date, fecha_fin_estimada date, observaciones text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.codigo,
        c.nombre,
        ui.fecha_inicio,
        ui.fecha_fin_estimada,
        ui.observaciones
    FROM usuario_inactividad ui
    JOIN catalogo_motivo_inactividad c ON ui.motivo_id = c.id
    WHERE ui.usuario_id = p_usuario_id
      AND ui.fecha_fin_real IS NULL
    ORDER BY ui.fecha_inicio DESC
    LIMIT 1;
END;
$$;


--
-- Name: iniciar_salida_unidad(integer, integer, numeric, numeric, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.iniciar_salida_unidad(p_unidad_id integer, p_ruta_inicial_id integer DEFAULT NULL::integer, p_km_inicial numeric DEFAULT NULL::numeric, p_combustible_inicial numeric DEFAULT NULL::numeric, p_observaciones text DEFAULT NULL::text) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_salida_id INT;
    v_tripulacion JSONB;
    v_salida_existente INT;
BEGIN
    -- Verificar que no haya salida activa
    SELECT id INTO v_salida_existente
    FROM salida_unidad
    WHERE unidad_id = p_unidad_id
      AND estado = 'EN_SALIDA';

    IF v_salida_existente IS NOT NULL THEN
        RAISE EXCEPTION 'La unidad ya tiene una salida activa (ID: %)', v_salida_existente;
    END IF;

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

    -- Si no hay tripulación permanente, buscar en turnos
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
            t.fecha = CURRENT_DATE
            OR t.fecha = CURRENT_DATE + INTERVAL '1 day'
            OR (t.fecha <= CURRENT_DATE AND COALESCE(t.fecha_fin, t.fecha) >= CURRENT_DATE)
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
$$;


--
-- Name: limpiar_asignaciones_expiradas(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.limpiar_asignaciones_expiradas() RETURNS integer
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: FUNCTION limpiar_asignaciones_expiradas(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.limpiar_asignaciones_expiradas() IS 'Job nocturno para limpiar asignaciones de días anteriores que quedaron huérfanas.
Debería ejecutarse con pg_cron o similar a las 00:00.';


--
-- Name: norm_txt(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.norm_txt(x text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT lower(regexp_replace(unaccent(coalesce(x,'')), '\s+', ' ', 'g'));
$$;


--
-- Name: obtener_comandante_unidad(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.obtener_comandante_unidad(p_unidad_id integer) RETURNS TABLE(usuario_id integer, nombre_completo character varying, chapa character varying, tipo_asignacion character varying)
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Primero buscar en asignaciones permanentes
    RETURN QUERY
    SELECT
        u.id,
        u.nombre_completo,
        u.chapa,
        'PERMANENTE'::VARCHAR
    FROM brigada_unidad bu
    JOIN usuario u ON bu.brigada_id = u.id
    WHERE bu.unidad_id = p_unidad_id
      AND bu.activo = TRUE
      AND bu.es_comandante = TRUE
    LIMIT 1;

    IF FOUND THEN
        RETURN;
    END IF;

    -- Si no hay permanente, buscar en turnos activos
    RETURN QUERY
    SELECT
        u.id,
        u.nombre_completo,
        u.chapa,
        'TURNO'::VARCHAR
    FROM tripulacion_turno tt
    JOIN asignacion_unidad au ON tt.asignacion_id = au.id
    JOIN turno t ON au.turno_id = t.id
    JOIN usuario u ON tt.usuario_id = u.id
    WHERE au.unidad_id = p_unidad_id
      AND tt.es_comandante = TRUE
      AND t.estado IN ('ACTIVO', 'PLANIFICADO')
      AND (
          t.fecha = CURRENT_DATE
          OR (t.fecha <= CURRENT_DATE AND COALESCE(t.fecha_fin, t.fecha) >= CURRENT_DATE)
      )
    LIMIT 1;
END;
$$;


--
-- Name: FUNCTION obtener_comandante_unidad(p_unidad_id integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.obtener_comandante_unidad(p_unidad_id integer) IS 'Obtiene el comandante actual de una unidad';


--
-- Name: obtener_historial_combustible(integer, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.obtener_historial_combustible(p_unidad_id integer, p_fecha date DEFAULT CURRENT_DATE) RETURNS TABLE(hora timestamp with time zone, tipo_situacion character varying, combustible_fraccion character varying, combustible_decimal numeric, consumo numeric, km_recorridos numeric, ubicacion text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.created_at AS hora,
        s.tipo_situacion,
        s.combustible_fraccion,
        s.combustible AS combustible_decimal,
        s.combustible - LAG(s.combustible) OVER (ORDER BY s.created_at) AS consumo,
        s.kilometraje_unidad - LAG(s.kilometraje_unidad) OVER (ORDER BY s.created_at) AS km_recorridos,
        CONCAT(r.codigo, ' Km ', s.km) AS ubicacion
    FROM situacion s
    LEFT JOIN ruta r ON s.ruta_id = r.id
    LEFT JOIN turno t ON s.turno_id = t.id
    WHERE s.unidad_id = p_unidad_id
      AND t.fecha = p_fecha
      AND s.combustible IS NOT NULL
    ORDER BY s.created_at;
END;
$$;


--
-- Name: FUNCTION obtener_historial_combustible(p_unidad_id integer, p_fecha date); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.obtener_historial_combustible(p_unidad_id integer, p_fecha date) IS 'Obtiene el historial de combustible de una unidad para un día específico';


--
-- Name: obtener_plantilla_360(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.obtener_plantilla_360(p_tipo_unidad character varying) RETURNS TABLE(id integer, tipo_unidad character varying, nombre character varying, descripcion text, version integer, secciones jsonb)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.tipo_unidad,
        p.nombre,
        p.descripcion,
        p.version,
        p.secciones
    FROM plantilla_inspeccion_360 p
    WHERE p.tipo_unidad = p_tipo_unidad
      AND p.activa = TRUE
    LIMIT 1;

    -- Si no hay plantilla específica, buscar DEFAULT
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT
            p.id,
            p.tipo_unidad,
            p.nombre,
            p.descripcion,
            p.version,
            p.secciones
        FROM plantilla_inspeccion_360 p
        WHERE p.tipo_unidad = 'DEFAULT'
          AND p.activa = TRUE
        LIMIT 1;
    END IF;
END;
$$;


--
-- Name: FUNCTION obtener_plantilla_360(p_tipo_unidad character varying); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.obtener_plantilla_360(p_tipo_unidad character varying) IS 'Obtiene la plantilla 360 activa para un tipo de unidad';


--
-- Name: obtener_ruta_activa(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.obtener_ruta_activa(p_asignacion_id integer) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_ruta_activa_id INT;
BEGIN
    -- Obtener la ruta activa de la asignación
    SELECT ruta_activa_id INTO v_ruta_activa_id
    FROM asignacion_unidad
    WHERE id = p_asignacion_id;

    -- Si no hay ruta activa, usar la ruta asignada por defecto
    IF v_ruta_activa_id IS NULL THEN
        SELECT ruta_id INTO v_ruta_activa_id
        FROM asignacion_unidad
        WHERE id = p_asignacion_id;
    END IF;

    RETURN v_ruta_activa_id;
END;
$$;


--
-- Name: FUNCTION obtener_ruta_activa(p_asignacion_id integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.obtener_ruta_activa(p_asignacion_id integer) IS 'Obtiene la ruta activa de una asignación, o la ruta por defecto si no hay activa';


--
-- Name: obtener_sede_efectiva_unidad(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.obtener_sede_efectiva_unidad(p_unidad_id integer) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_sede_id INT;
BEGIN
    -- Buscar reasignaci??n activa
    SELECT sede_destino_id INTO v_sede_id
    FROM reasignacion_sede
    WHERE tipo = 'UNIDAD'
      AND recurso_id = p_unidad_id
      AND estado = 'ACTIVA'
      AND fecha_inicio <= CURRENT_DATE
      AND (fecha_fin IS NULL OR fecha_fin >= CURRENT_DATE)
    ORDER BY created_at DESC
    LIMIT 1;

    -- Si no hay reasignaci??n, usar sede original
    IF v_sede_id IS NULL THEN
        SELECT sede_id INTO v_sede_id
        FROM unidad
        WHERE id = p_unidad_id;
    END IF;

    RETURN v_sede_id;
END;
$$;


--
-- Name: obtener_sede_efectiva_usuario(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.obtener_sede_efectiva_usuario(p_usuario_id integer) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_sede_id INT;
BEGIN
    -- Buscar reasignaci??n activa
    SELECT sede_destino_id INTO v_sede_id
    FROM reasignacion_sede
    WHERE tipo = 'USUARIO'
      AND recurso_id = p_usuario_id
      AND estado = 'ACTIVA'
      AND fecha_inicio <= CURRENT_DATE
      AND (fecha_fin IS NULL OR fecha_fin >= CURRENT_DATE)
    ORDER BY created_at DESC
    LIMIT 1;

    -- Si no hay reasignaci??n, usar sede original
    IF v_sede_id IS NULL THEN
        SELECT sede_id INTO v_sede_id
        FROM usuario
        WHERE id = p_usuario_id;
    END IF;

    RETURN v_sede_id;
END;
$$;


--
-- Name: FUNCTION obtener_sede_efectiva_usuario(p_usuario_id integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.obtener_sede_efectiva_usuario(p_usuario_id integer) IS 'Retorna la sede efectiva del usuario considerando reasignaciones temporales';


--
-- Name: obtener_tokens_push(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.obtener_tokens_push(p_usuario_id integer) RETURNS TABLE(push_token character varying, plataforma character varying)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT dp.push_token, dp.plataforma
    FROM dispositivo_push dp
    WHERE dp.usuario_id = p_usuario_id
      AND dp.activo = TRUE;
END;
$$;


--
-- Name: obtener_tokens_tripulacion(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.obtener_tokens_tripulacion(p_salida_id integer) RETURNS TABLE(usuario_id integer, push_token character varying, plataforma character varying, nombre_completo character varying)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        tt.usuario_id,
        dp.push_token,
        dp.plataforma,
        u.nombre_completo
    FROM tripulacion_turno tt
    JOIN salida_unidad su ON su.asignacion_id = tt.asignacion_id
    JOIN usuario u ON u.id = tt.usuario_id
    LEFT JOIN dispositivo_push dp ON dp.usuario_id = tt.usuario_id AND dp.activo = TRUE
    WHERE su.id = p_salida_id;
END;
$$;


--
-- Name: puede_iniciar_salida_con_360(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.puede_iniciar_salida_con_360(p_salida_id integer) RETURNS TABLE(puede_iniciar boolean, inspeccion_id integer, estado_inspeccion character varying, mensaje text)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_inspeccion RECORD;
BEGIN
    -- Buscar inspección vigente para esta salida
    SELECT i.id, i.estado
    INTO v_inspeccion
    FROM inspeccion_360 i
    WHERE i.salida_id = p_salida_id
      AND i.estado IN ('PENDIENTE', 'APROBADA')
    ORDER BY i.created_at DESC
    LIMIT 1;

    IF v_inspeccion IS NULL THEN
        RETURN QUERY SELECT
            FALSE,
            NULL::INT,
            NULL::VARCHAR,
            'No existe inspección 360 para esta salida'::TEXT;
    ELSIF v_inspeccion.estado = 'PENDIENTE' THEN
        RETURN QUERY SELECT
            FALSE,
            v_inspeccion.id,
            v_inspeccion.estado,
            'La inspección 360 está pendiente de aprobación'::TEXT;
    ELSE
        RETURN QUERY SELECT
            TRUE,
            v_inspeccion.id,
            v_inspeccion.estado,
            'Inspección 360 aprobada'::TEXT;
    END IF;
END;
$$;


--
-- Name: FUNCTION puede_iniciar_salida_con_360(p_salida_id integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.puede_iniciar_salida_con_360(p_salida_id integer) IS 'Verifica si una salida tiene inspección 360 aprobada';


--
-- Name: rechazar_inspeccion_360(integer, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rechazar_inspeccion_360(p_inspeccion_id integer, p_aprobador_id integer, p_motivo text) RETURNS TABLE(success boolean, mensaje text)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_inspeccion RECORD;
    v_es_comandante BOOLEAN;
BEGIN
    -- Obtener datos de la inspección
    SELECT i.*, s.unidad_id
    INTO v_inspeccion
    FROM inspeccion_360 i
    LEFT JOIN salida_unidad s ON i.salida_id = s.id
    WHERE i.id = p_inspeccion_id;

    IF v_inspeccion IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Inspección no encontrada'::TEXT;
        RETURN;
    END IF;

    IF v_inspeccion.estado != 'PENDIENTE' THEN
        RETURN QUERY SELECT FALSE, ('La inspección ya fue ' || v_inspeccion.estado)::TEXT;
        RETURN;
    END IF;

    -- Verificar que el aprobador sea comandante de la unidad
    SELECT EXISTS (
        SELECT 1 FROM brigada_unidad bu
        WHERE bu.brigada_id = p_aprobador_id
          AND bu.unidad_id = v_inspeccion.unidad_id
          AND bu.activo = TRUE
          AND bu.es_comandante = TRUE
        UNION
        SELECT 1 FROM tripulacion_turno tt
        JOIN asignacion_unidad au ON tt.asignacion_id = au.id
        WHERE tt.usuario_id = p_aprobador_id
          AND au.unidad_id = v_inspeccion.unidad_id
          AND tt.es_comandante = TRUE
    ) INTO v_es_comandante;

    IF NOT v_es_comandante THEN
        RETURN QUERY SELECT FALSE, 'Solo el comandante de la unidad puede rechazar la inspección'::TEXT;
        RETURN;
    END IF;

    -- Rechazar la inspección
    UPDATE inspeccion_360
    SET estado = 'RECHAZADA',
        aprobado_por = p_aprobador_id,
        fecha_aprobacion = NOW(),
        motivo_rechazo = p_motivo
    WHERE id = p_inspeccion_id;

    RETURN QUERY SELECT TRUE, 'Inspección rechazada. El inspector debe corregir y reenviar.'::TEXT;
END;
$$;


--
-- Name: FUNCTION rechazar_inspeccion_360(p_inspeccion_id integer, p_aprobador_id integer, p_motivo text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.rechazar_inspeccion_360(p_inspeccion_id integer, p_aprobador_id integer, p_motivo text) IS 'Rechaza una inspección 360 (solo comandante)';


--
-- Name: refresh_intelligence_views(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_intelligence_views() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Refrescar vistas principales con historial completo
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_vehiculo_historial;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_piloto_historial;

    -- Refrescar vistas simplificadas
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_vehiculos_reincidentes;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_pilotos_problematicos;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_puntos_calientes;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_tendencias_temporales;
END;
$$;


--
-- Name: FUNCTION refresh_intelligence_views(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.refresh_intelligence_views() IS 'Refresca todas las vistas materializadas de inteligencia (incluyendo mv_vehiculo_historial y mv_piloto_historial)';


--
-- Name: registrar_cambio(character varying, integer, text, integer, jsonb, jsonb, integer, bigint, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.registrar_cambio(p_tipo_cambio character varying, p_usuario_afectado_id integer, p_motivo text, p_realizado_por integer, p_valores_anteriores jsonb DEFAULT NULL::jsonb, p_valores_nuevos jsonb DEFAULT NULL::jsonb, p_asignacion_id integer DEFAULT NULL::integer, p_situacion_id bigint DEFAULT NULL::bigint, p_unidad_id integer DEFAULT NULL::integer, p_autorizado_por integer DEFAULT NULL::integer) RETURNS bigint
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_cambio_id BIGINT;
BEGIN
    INSERT INTO registro_cambio (
        tipo_cambio,
        usuario_afectado_id,
        motivo,
        realizado_por,
        valores_anteriores,
        valores_nuevos,
        asignacion_id,
        situacion_id,
        unidad_id,
        autorizado_por
    ) VALUES (
        p_tipo_cambio,
        p_usuario_afectado_id,
        p_motivo,
        p_realizado_por,
        p_valores_anteriores,
        p_valores_nuevos,
        p_asignacion_id,
        p_situacion_id,
        p_unidad_id,
        p_autorizado_por
    )
    RETURNING id INTO v_cambio_id;

    RETURN v_cambio_id;
END;
$$;


--
-- Name: FUNCTION registrar_cambio(p_tipo_cambio character varying, p_usuario_afectado_id integer, p_motivo text, p_realizado_por integer, p_valores_anteriores jsonb, p_valores_nuevos jsonb, p_asignacion_id integer, p_situacion_id bigint, p_unidad_id integer, p_autorizado_por integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.registrar_cambio(p_tipo_cambio character varying, p_usuario_afectado_id integer, p_motivo text, p_realizado_por integer, p_valores_anteriores jsonb, p_valores_nuevos jsonb, p_asignacion_id integer, p_situacion_id bigint, p_unidad_id integer, p_autorizado_por integer) IS 'Registra un cambio en el sistema con auditor??a completa';


--
-- Name: registrar_ingreso_sede(integer, integer, character varying, numeric, numeric, text, boolean, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.registrar_ingreso_sede(p_salida_id integer, p_sede_id integer, p_tipo_ingreso character varying, p_km numeric, p_combustible numeric, p_observaciones text, p_es_ingreso_final boolean, p_registrado_por integer) RETURNS integer
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: registrar_salida_de_sede(integer, numeric, numeric, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.registrar_salida_de_sede(p_ingreso_id integer, p_km_salida numeric DEFAULT NULL::numeric, p_combustible_salida numeric DEFAULT NULL::numeric, p_observaciones text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE ingreso_sede
    SET fecha_hora_salida = NOW(),
        km_salida_nueva = p_km_salida,
        combustible_salida_nueva = p_combustible_salida,
        observaciones_salida = p_observaciones
    WHERE id = p_ingreso_id
      AND fecha_hora_salida IS NULL
      AND es_ingreso_final = FALSE; -- No se puede salir de un ingreso final

    RETURN FOUND;
END;
$$;


--
-- Name: FUNCTION registrar_salida_de_sede(p_ingreso_id integer, p_km_salida numeric, p_combustible_salida numeric, p_observaciones text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.registrar_salida_de_sede(p_ingreso_id integer, p_km_salida numeric, p_combustible_salida numeric, p_observaciones text) IS 'Marca que la unidad volvi?? a salir despu??s de un ingreso temporal';


--
-- Name: resolver_alerta(integer, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.resolver_alerta(p_alerta_id integer, p_usuario_id integer, p_nota text DEFAULT NULL::text) RETURNS TABLE(success boolean, mensaje text)
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_alerta alerta;
BEGIN
  -- Obtener alerta
  SELECT * INTO v_alerta FROM alerta WHERE id = p_alerta_id;

  IF v_alerta IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Alerta no encontrada'::TEXT;
    RETURN;
  END IF;

  IF v_alerta.estado NOT IN ('ACTIVA', 'ATENDIDA') THEN
    RETURN QUERY SELECT FALSE, 'La alerta ya está cerrada'::TEXT;
    RETURN;
  END IF;

  -- Actualizar alerta
  UPDATE alerta
  SET estado = 'RESUELTA',
      atendida_por = COALESCE(atendida_por, p_usuario_id),
      fecha_atencion = COALESCE(fecha_atencion, CURRENT_TIMESTAMP),
      nota_resolucion = COALESCE(p_nota, nota_resolucion),
      updated_at = CURRENT_TIMESTAMP
  WHERE id = p_alerta_id;

  RETURN QUERY SELECT TRUE, 'Alerta resuelta'::TEXT;
END;
$$;


--
-- Name: FUNCTION resolver_alerta(p_alerta_id integer, p_usuario_id integer, p_nota text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.resolver_alerta(p_alerta_id integer, p_usuario_id integer, p_nota text) IS 'Marca una alerta como resuelta';


--
-- Name: responder_aprobacion(integer, integer, character varying, text, numeric, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.responder_aprobacion(p_aprobacion_id integer, p_usuario_id integer, p_respuesta character varying, p_motivo text DEFAULT NULL::text, p_latitud numeric DEFAULT NULL::numeric, p_longitud numeric DEFAULT NULL::numeric) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_aprobacion RECORD;
    v_total_tripulantes INTEGER;
    v_aprobados INTEGER;
    v_rechazados INTEGER;
    v_pendientes INTEGER;
    v_nuevo_estado VARCHAR;
BEGIN
    -- Verificar que la aprobacion existe y esta pendiente
    SELECT * INTO v_aprobacion
    FROM aprobacion_tripulacion
    WHERE id = p_aprobacion_id;

    IF v_aprobacion IS NULL THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Aprobacion no encontrada');
    END IF;

    IF v_aprobacion.estado != 'PENDIENTE' THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'La aprobacion ya no esta pendiente');
    END IF;

    -- Registrar respuesta
    UPDATE aprobacion_respuesta
    SET respuesta = p_respuesta,
        fecha_respuesta = NOW(),
        motivo_rechazo = p_motivo,
        latitud = p_latitud,
        longitud = p_longitud
    WHERE aprobacion_id = p_aprobacion_id
      AND usuario_id = p_usuario_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Usuario no es parte de esta aprobacion');
    END IF;

    -- Contar respuestas
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE respuesta = 'APROBADO'),
        COUNT(*) FILTER (WHERE respuesta = 'RECHAZADO'),
        COUNT(*) FILTER (WHERE respuesta = 'PENDIENTE')
    INTO v_total_tripulantes, v_aprobados, v_rechazados, v_pendientes
    FROM aprobacion_respuesta
    WHERE aprobacion_id = p_aprobacion_id;

    -- Determinar nuevo estado
    v_nuevo_estado := 'PENDIENTE';

    -- Si alguien rechazo y se requiere todos
    IF v_rechazados > 0 AND v_aprobacion.requiere_todos THEN
        v_nuevo_estado := 'RECHAZADA';
    -- Si todos aprobaron
    ELSIF v_aprobados = v_total_tripulantes THEN
        v_nuevo_estado := 'COMPLETADA';
    -- Si no requiere todos y hay suficientes aprobaciones
    ELSIF NOT v_aprobacion.requiere_todos AND v_aprobados >= v_aprobacion.minimo_aprobaciones THEN
        v_nuevo_estado := 'COMPLETADA';
    END IF;

    -- Actualizar estado si cambio
    IF v_nuevo_estado != 'PENDIENTE' THEN
        UPDATE aprobacion_tripulacion
        SET estado = v_nuevo_estado,
            fecha_completada = NOW(),
            updated_at = NOW()
        WHERE id = p_aprobacion_id;
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'estado', v_nuevo_estado,
        'total', v_total_tripulantes,
        'aprobados', v_aprobados,
        'rechazados', v_rechazados,
        'pendientes', v_pendientes
    );
END;
$$;


--
-- Name: tiene_permiso_sede(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tiene_permiso_sede(p_usuario_id integer, p_sede_id integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_rol VARCHAR(50);
    v_sede_usuario INT;
BEGIN
    -- Obtener rol del usuario
    SELECT r.nombre INTO v_rol
    FROM usuario u
    JOIN rol r ON u.rol_id = r.id
    WHERE u.id = p_usuario_id;

    -- COP tiene acceso a TODAS las sedes
    IF v_rol = 'COP' THEN
        RETURN TRUE;
    END IF;

    -- Otros roles solo tienen acceso a su sede
    v_sede_usuario := obtener_sede_efectiva_usuario(p_usuario_id);

    RETURN v_sede_usuario = p_sede_id;
END;
$$;


--
-- Name: FUNCTION tiene_permiso_sede(p_usuario_id integer, p_sede_id integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.tiene_permiso_sede(p_usuario_id integer, p_sede_id integer) IS 'Verifica si un usuario tiene permiso para operar en una sede. COP tiene acceso universal.';


--
-- Name: tr_fn_sync_sede_ubicacion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tr_fn_sync_sede_ubicacion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Si se actualiza departamento_id, sincronizar campo texto
    IF NEW.departamento_id IS NOT NULL AND NEW.departamento_id != OLD.departamento_id THEN
        SELECT nombre INTO NEW.departamento FROM departamento WHERE id = NEW.departamento_id;
    END IF;
    
    -- Si se actualiza municipio_id, sincronizar campo texto
    IF NEW.municipio_id IS NOT NULL AND NEW.municipio_id != OLD.municipio_id THEN
        SELECT nombre INTO NEW.municipio FROM municipio WHERE id = NEW.municipio_id;
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION tr_fn_sync_sede_ubicacion(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.tr_fn_sync_sede_ubicacion() IS 'TEMPORAL: Sincroniza campos texto legacy desde FKs. Eliminar en 093C.';


--
-- Name: trg_fn_id_situacion_persistente(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_fn_id_situacion_persistente() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_num_anual INTEGER;
BEGIN
    IF NEW.id_determinista IS NULL THEN
        v_num_anual := fn_get_num_anual_sp();
        NEW.id_determinista := fn_generar_id_situacion_persistente(
            COALESCE(NEW.fecha_inicio::DATE, CURRENT_DATE),
            NEW.ruta_id,
            NEW.km_inicio,
            v_num_anual
        );
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: trigger_actualizar_descripcion_obstruccion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_actualizar_descripcion_obstruccion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.descripcion_generada := fn_generar_descripcion_obstruccion(
        NEW.hay_vehiculo_fuera_via,
        NEW.tipo_obstruccion,
        NEW.sentido_principal,
        NEW.sentido_contrario,
        NULL -- El sentido se puede obtener de la situaci??n si es necesario
    );
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;


--
-- Name: trigger_actualizar_ruta_activa(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_actualizar_ruta_activa() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.tipo_situacion IN ('SALIDA_SEDE', 'CAMBIO_RUTA') THEN
        IF NEW.ruta_id IS NOT NULL AND NEW.asignacion_id IS NOT NULL THEN
            PERFORM actualizar_ruta_activa(NEW.asignacion_id, NEW.ruta_id);
        END IF;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: trigger_auditar_cambio_asignacion_cerrada(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_auditar_cambio_asignacion_cerrada() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Si el d??a est?? cerrado y se est?? modificando
    IF OLD.dia_cerrado = TRUE THEN
        NEW.modificado_despues_cierre := TRUE;

        -- Si no se proporciona motivo, rechazar
        IF NEW.motivo_modificacion_cierre IS NULL OR NEW.motivo_modificacion_cierre = '' THEN
            RAISE EXCEPTION 'Se requiere motivo para modificar asignaci??n de d??a cerrado';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: trigger_auditar_cambio_situacion_cerrada(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_auditar_cambio_situacion_cerrada() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_asignacion_cerrada BOOLEAN;
BEGIN
    -- Verificar si la asignaci??n est?? cerrada
    SELECT dia_cerrado
    INTO v_asignacion_cerrada
    FROM asignacion_unidad
    WHERE id = OLD.asignacion_id;

    IF v_asignacion_cerrada = TRUE THEN
        NEW.modificado_despues_cierre := TRUE;

        -- Si no se proporciona motivo, rechazar
        IF NEW.motivo_modificacion_cierre IS NULL OR NEW.motivo_modificacion_cierre = '' THEN
            RAISE EXCEPTION 'Se requiere motivo para modificar situaci??n de d??a cerrado';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: trigger_validar_asignacion_unidad(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_validar_asignacion_unidad() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_fecha DATE;
    v_fecha_fin DATE;
    v_validacion RECORD;
BEGIN
    -- Obtener fechas del turno
    SELECT t.fecha, t.fecha_fin INTO v_fecha, v_fecha_fin
    FROM turno t WHERE t.id = NEW.turno_id;

    -- Validar disponibilidad
    SELECT * INTO v_validacion
    FROM validar_disponibilidad_unidad_fecha(
        NEW.unidad_id,
        v_fecha,
        v_fecha_fin,
        CASE WHEN TG_OP = 'UPDATE' THEN OLD.id ELSE NULL END
    );

    IF NOT v_validacion.disponible THEN
        RAISE EXCEPTION 'No se puede asignar la unidad: %', v_validacion.mensaje;
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: trigger_validar_suspension_acceso(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_validar_suspension_acceso() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_validacion RECORD;
BEGIN
    -- Solo validar si se est?? desactivando el acceso
    IF OLD.acceso_app_activo = TRUE AND NEW.acceso_app_activo = FALSE THEN
        SELECT *
        INTO v_validacion
        FROM validar_suspension_acceso(NEW.id);

        IF v_validacion.puede_suspender = FALSE THEN
            RAISE EXCEPTION 'No se puede suspender acceso: %', v_validacion.motivo_rechazo;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: update_aseguradora_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_aseguradora_stats() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.aseguradora_id IS NOT NULL THEN
        UPDATE aseguradora SET
            total_incidentes = total_incidentes + 1
        WHERE id = NEW.aseguradora_id;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION update_aseguradora_stats(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_aseguradora_stats() IS 'Actualiza contadores de incidentes en tabla aseguradora';


--
-- Name: update_combustible_unidad(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_combustible_unidad() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE unidad
    SET
        combustible_actual = NEW.combustible_nuevo,
        odometro_actual = COALESCE(NEW.odometro_actual, odometro_actual),
        updated_at = NOW()
    WHERE id = NEW.unidad_id;

    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION update_combustible_unidad(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_combustible_unidad() IS 'Actualiza autom??ticamente el combustible actual de la unidad';


--
-- Name: update_config_columnas_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_config_columnas_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_grua_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_grua_stats() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE grua SET
            total_servicios = total_servicios + 1,
            ultima_vez_usado = NOW()
        WHERE id = NEW.grua_id;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION update_grua_stats(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_grua_stats() IS 'Actualiza contadores de servicios en tabla grua';


--
-- Name: update_piloto_sancion_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_piloto_sancion_stats() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.piloto_id IS NOT NULL THEN
        UPDATE piloto SET
            total_sanciones = total_sanciones + 1
        WHERE id = NEW.piloto_id;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION update_piloto_sancion_stats(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_piloto_sancion_stats() IS 'Actualiza contadores de sanciones en tabla piloto';


--
-- Name: update_piloto_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_piloto_stats() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.piloto_id IS NOT NULL THEN
        UPDATE piloto SET
            total_incidentes = total_incidentes + 1,
            ultimo_incidente = NOW(),
            primer_incidente = COALESCE(primer_incidente, NOW())
        WHERE id = NEW.piloto_id;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION update_piloto_stats(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_piloto_stats() IS 'Actualiza contadores de incidentes en tabla piloto';


--
-- Name: update_situacion_draft_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_situacion_draft_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION update_updated_at_column(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_updated_at_column() IS 'Actualiza autom??ticamente la columna updated_at al modificar un registro';


--
-- Name: update_vehiculo_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_vehiculo_stats() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE vehiculo SET
            total_incidentes = total_incidentes + 1,
            ultimo_incidente = NOW(),
            primer_incidente = COALESCE(primer_incidente, NOW())
        WHERE id = NEW.vehiculo_id;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION update_vehiculo_stats(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_vehiculo_stats() IS 'Actualiza contadores de incidentes en tabla vehiculo';


--
-- Name: usuario_tiene_rol(integer, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.usuario_tiene_rol(p_usuario_id integer, p_rol_nombre character varying) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM usuario_rol ur
        JOIN rol r ON ur.rol_id = r.id
        WHERE ur.usuario_id = p_usuario_id
          AND r.nombre = p_rol_nombre
          AND ur.activo = true
    );
END;
$$;


--
-- Name: validar_actividad_incidente(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validar_actividad_incidente() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    requiere_incidente_val BOOLEAN;
BEGIN
    -- Si la actividad tiene incidente asociado
    IF NEW.incidente_id IS NOT NULL THEN
        -- Verificar que el tipo de actividad requiera incidente
        SELECT requiere_incidente INTO requiere_incidente_val
        FROM tipo_actividad
        WHERE id = NEW.tipo_actividad_id;

        IF requiere_incidente_val = FALSE THEN
            RAISE EXCEPTION 'El tipo de actividad "%" no puede estar asociado a un incidente',
                (SELECT nombre FROM tipo_actividad WHERE id = NEW.tipo_actividad_id);
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION validar_actividad_incidente(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.validar_actividad_incidente() IS 'Valida que las actividades asociadas a incidentes tengan tipo correcto';


--
-- Name: validar_disponibilidad_brigada(integer, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validar_disponibilidad_brigada(p_usuario_id integer, p_fecha date) RETURNS TABLE(disponible boolean, mensaje text, ultimo_turno_fecha date, dias_descanso integer)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_tiene_asignacion_hoy BOOLEAN;
    v_tiene_salida_activa BOOLEAN;
    v_ultima_salida DATE;
    v_dias_descanso INTEGER;
BEGIN
    -- 1. Verificar si tiene asignación activa para esta fecha
    SELECT EXISTS(
        SELECT 1
        FROM tripulacion_turno tt
        JOIN asignacion_unidad au ON tt.asignacion_id = au.id
        JOIN turno t ON au.turno_id = t.id
        WHERE tt.usuario_id = p_usuario_id
          AND t.estado IN ('PLANIFICADO', 'ACTIVO')
          AND (t.fecha = p_fecha OR (t.fecha <= p_fecha AND COALESCE(t.fecha_fin, t.fecha) >= p_fecha))
    ) INTO v_tiene_asignacion_hoy;

    -- 2. Verificar si tiene salida activa (EN_SALIDA)
    SELECT EXISTS(
        SELECT 1
        FROM salida_unidad su
        JOIN tripulacion_turno tt ON su.unidad_id = (
            SELECT au.unidad_id
            FROM asignacion_unidad au
            WHERE au.id = tt.asignacion_id
        )
        WHERE tt.usuario_id = p_usuario_id
          AND su.estado = 'EN_SALIDA'
    ) INTO v_tiene_salida_activa;

    -- 3. Obtener última SALIDA REAL (no asignación) de los últimos 30 días
    -- Busca en salida_unidad donde el usuario fue parte de la tripulación
    SELECT MAX(su.fecha_hora_salida::DATE) INTO v_ultima_salida
    FROM salida_unidad su
    JOIN asignacion_unidad au ON su.unidad_id = au.unidad_id
    JOIN turno t ON au.turno_id = t.id
    JOIN tripulacion_turno tt ON tt.asignacion_id = au.id
    WHERE tt.usuario_id = p_usuario_id
      AND su.fecha_hora_salida >= (p_fecha - INTERVAL '30 days')
      AND su.fecha_hora_salida::DATE < p_fecha
      AND su.estado IN ('EN_SALIDA', 'FINALIZADA', 'CANCELADA');

    -- 4. Calcular días de descanso basado en SALIDAS REALES
    IF v_ultima_salida IS NOT NULL THEN
        v_dias_descanso := p_fecha - v_ultima_salida;
    ELSE
        v_dias_descanso := 999; -- Nunca ha salido o hace más de 30 días
    END IF;

    -- 5. Retornar resultado
    RETURN QUERY SELECT
        CASE
            WHEN v_tiene_salida_activa THEN FALSE
            WHEN v_tiene_asignacion_hoy THEN FALSE
            WHEN v_dias_descanso < 2 THEN FALSE
            ELSE TRUE
        END,
        CASE
            WHEN v_tiene_salida_activa THEN 'Brigada tiene salida activa en este momento'::TEXT
            WHEN v_tiene_asignacion_hoy THEN 'Brigada ya tiene asignación para esta fecha'::TEXT
            WHEN v_dias_descanso = 0 THEN 'Brigada salió hoy - necesita descanso'::TEXT
            WHEN v_dias_descanso = 1 THEN 'Brigada salió ayer - descanso recomendado'::TEXT
            ELSE 'Brigada disponible'::TEXT
        END,
        v_ultima_salida,
        v_dias_descanso;
END;
$$;


--
-- Name: FUNCTION validar_disponibilidad_brigada(p_usuario_id integer, p_fecha date); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.validar_disponibilidad_brigada(p_usuario_id integer, p_fecha date) IS 'Valida disponibilidad de brigada basándose en SALIDAS REALES (salida_unidad),
no en asignaciones. Solo cuenta para descanso si realmente salió.';


--
-- Name: validar_disponibilidad_unidad(integer, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validar_disponibilidad_unidad(p_unidad_id integer, p_fecha date) RETURNS TABLE(disponible boolean, mensaje text, ultimo_uso_fecha date, dias_descanso integer, combustible_suficiente boolean)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  WITH asignaciones_fecha AS (
    SELECT au.id FROM asignacion_unidad au
    JOIN turno t ON au.turno_id = t.id
    WHERE au.unidad_id = p_unidad_id
      AND t.estado IN ('PLANIFICADO', 'ACTIVO')
      AND (t.fecha = p_fecha OR (t.fecha <= p_fecha AND COALESCE(t.fecha_fin, t.fecha) >= p_fecha))
  ),
  ultimo_uso AS (
    SELECT MAX(t.fecha) AS fecha FROM asignacion_unidad au
    JOIN turno t ON au.turno_id = t.id
    WHERE au.unidad_id = p_unidad_id AND t.fecha < p_fecha
  )
  SELECT
    CASE
      WHEN (SELECT COUNT(*) FROM asignaciones_fecha) > 0 THEN FALSE
      WHEN un.activa = FALSE THEN FALSE
      WHEN un.disponible_transportes = FALSE THEN FALSE
      WHEN un.combustible_actual IS NOT NULL AND un.combustible_actual < 0.25 THEN FALSE
      ELSE TRUE
    END,
    CASE
      WHEN (SELECT COUNT(*) FROM asignaciones_fecha) > 0 THEN 'Unidad ya asignada para esta fecha'
      WHEN un.activa = FALSE THEN 'Unidad esta inactiva'
      WHEN un.disponible_transportes = FALSE THEN 'No autorizada por Transportes'
      WHEN un.combustible_actual IS NOT NULL AND un.combustible_actual < 0.25 THEN 'Combustible insuficiente (menos de 1/4)'
      ELSE 'Unidad disponible'
    END,
    (SELECT fecha FROM ultimo_uso),
    COALESCE(p_fecha - (SELECT fecha FROM ultimo_uso), 999)::INTEGER,
    COALESCE(un.combustible_actual IS NULL OR un.combustible_actual >= 0.25, TRUE)
  FROM unidad un WHERE un.id = p_unidad_id;
END;
$$;


--
-- Name: validar_disponibilidad_unidad_fecha(integer, date, date, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validar_disponibilidad_unidad_fecha(p_unidad_id integer, p_fecha_inicio date, p_fecha_fin date DEFAULT NULL::date, p_excluir_asignacion_id integer DEFAULT NULL::integer) RETURNS TABLE(disponible boolean, mensaje text, asignacion_conflicto_id integer, turno_conflicto_fecha date)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_fecha_fin DATE;
    v_conflicto RECORD;
BEGIN
    -- Si no hay fecha_fin, usar fecha_inicio
    v_fecha_fin := COALESCE(p_fecha_fin, p_fecha_inicio);

    -- Buscar conflictos
    SELECT a.id, t.fecha, t.fecha_fin, u.codigo
    INTO v_conflicto
    FROM asignacion_unidad a
    JOIN turno t ON a.turno_id = t.id
    JOIN unidad u ON a.unidad_id = u.id
    WHERE a.unidad_id = p_unidad_id
    AND t.estado IN ('PLANIFICADO', 'ACTIVO')
    AND a.hora_entrada_real IS NULL  -- No ha finalizado
    AND (p_excluir_asignacion_id IS NULL OR a.id <> p_excluir_asignacion_id)
    -- Verificar solapamiento de fechas
    AND (
        -- El rango solicitado se solapa con el rango existente
        (p_fecha_inicio <= COALESCE(t.fecha_fin, t.fecha) AND v_fecha_fin >= t.fecha)
    )
    LIMIT 1;

    IF v_conflicto.id IS NOT NULL THEN
        RETURN QUERY SELECT
            FALSE,
            'La unidad ya está asignada para el ' ||
                CASE
                    WHEN v_conflicto.fecha_fin IS NOT NULL
                    THEN 'período ' || v_conflicto.fecha || ' al ' || v_conflicto.fecha_fin
                    ELSE 'día ' || v_conflicto.fecha
                END,
            v_conflicto.id,
            v_conflicto.fecha;
    ELSE
        RETURN QUERY SELECT
            TRUE,
            'Unidad disponible'::TEXT,
            NULL::INTEGER,
            NULL::DATE;
    END IF;
END;
$$;


--
-- Name: FUNCTION validar_disponibilidad_unidad_fecha(p_unidad_id integer, p_fecha_inicio date, p_fecha_fin date, p_excluir_asignacion_id integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.validar_disponibilidad_unidad_fecha(p_unidad_id integer, p_fecha_inicio date, p_fecha_fin date, p_excluir_asignacion_id integer) IS 'Valida si una unidad está disponible para un rango de fechas. Evita asignar la misma unidad dos veces en días que se solapan.';


--
-- Name: validar_remocion_asignacion(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validar_remocion_asignacion(p_usuario_id integer, p_asignacion_id integer) RETURNS TABLE(puede_remover boolean, motivo_rechazo text)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_tiene_movimiento_activo BOOLEAN;
    v_es_unico_piloto BOOLEAN;
BEGIN
    -- Verificar movimientos activos en esta asignaci??n
    SELECT EXISTS (
        SELECT 1
        FROM movimiento_brigada
        WHERE usuario_id = p_usuario_id
          AND (origen_asignacion_id = p_asignacion_id OR destino_asignacion_id = p_asignacion_id)
          AND hora_fin IS NULL
    ) INTO v_tiene_movimiento_activo;

    IF v_tiene_movimiento_activo THEN
        RETURN QUERY SELECT FALSE, 'El brigada tiene movimientos activos. Debe finalizarlos primero.';
        RETURN;
    END IF;

    -- Verificar si es el ??nico piloto (no se puede remover)
    SELECT EXISTS (
        SELECT 1
        FROM tripulacion_turno tt
        WHERE tt.asignacion_id = p_asignacion_id
          AND tt.usuario_id = p_usuario_id
          AND tt.rol_tripulacion = 'PILOTO'
          AND (
            SELECT COUNT(*)
            FROM tripulacion_turno
            WHERE asignacion_id = p_asignacion_id
              AND rol_tripulacion = 'PILOTO'
              AND presente = TRUE
          ) = 1
    ) INTO v_es_unico_piloto;

    IF v_es_unico_piloto THEN
        RETURN QUERY SELECT FALSE, 'No se puede remover al ??nico piloto de la unidad. Asignar otro piloto primero.';
        RETURN;
    END IF;

    -- Si pas?? todas las validaciones
    RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;


--
-- Name: FUNCTION validar_remocion_asignacion(p_usuario_id integer, p_asignacion_id integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.validar_remocion_asignacion(p_usuario_id integer, p_asignacion_id integer) IS 'Valida que un brigada pueda ser removido de una asignaci??n';


--
-- Name: validar_suspension_acceso(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validar_suspension_acceso(p_usuario_id integer) RETURNS TABLE(puede_suspender boolean, motivo_rechazo text)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_tiene_asignacion_activa BOOLEAN;
    v_tiene_movimiento_activo BOOLEAN;
    v_tiene_situacion_activa BOOLEAN;
BEGIN
    -- Verificar asignaci??n activa
    SELECT EXISTS (
        SELECT 1
        FROM tripulacion_turno tt
        JOIN asignacion_unidad au ON tt.asignacion_id = au.id
        JOIN turno t ON au.turno_id = t.id
        WHERE tt.usuario_id = p_usuario_id
          AND t.fecha = CURRENT_DATE
          AND au.dia_cerrado = FALSE
    ) INTO v_tiene_asignacion_activa;

    IF v_tiene_asignacion_activa THEN
        RETURN QUERY SELECT FALSE, 'El usuario tiene una asignaci??n activa. Debe ser removido primero.';
        RETURN;
    END IF;

    -- Verificar movimientos activos
    SELECT EXISTS (
        SELECT 1
        FROM movimiento_brigada
        WHERE usuario_id = p_usuario_id
          AND hora_fin IS NULL
    ) INTO v_tiene_movimiento_activo;

    IF v_tiene_movimiento_activo THEN
        RETURN QUERY SELECT FALSE, 'El usuario tiene movimientos activos. Debe finalizarlos primero.';
        RETURN;
    END IF;

    -- Verificar situaciones activas creadas por ??l
    SELECT EXISTS (
        SELECT 1
        FROM situacion
        WHERE creado_por = p_usuario_id
          AND estado = 'ACTIVA'
    ) INTO v_tiene_situacion_activa;

    IF v_tiene_situacion_activa THEN
        RETURN QUERY SELECT FALSE, 'El usuario tiene situaciones activas. Deben cerrarse primero.';
        RETURN;
    END IF;

    -- Si pas?? todas las validaciones
    RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;


--
-- Name: FUNCTION validar_suspension_acceso(p_usuario_id integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.validar_suspension_acceso(p_usuario_id integer) IS 'Valida que un usuario pueda tener su acceso suspendido';


--
-- Name: verificar_acceso_app(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verificar_acceso_app(p_usuario_id integer) RETURNS TABLE(tiene_acceso boolean, motivo_bloqueo text)
    LANGUAGE plpgsql
    AS $$
  DECLARE
    v_usuario RECORD;
    v_tiene_asignacion BOOLEAN;
  BEGIN
    -- Obtener informaci¢n del usuario
    SELECT * INTO v_usuario
    FROM usuario
    WHERE id = p_usuario_id;

    -- Si el usuario no existe
    IF NOT FOUND THEN
      RETURN QUERY SELECT FALSE, 'Usuario no encontrado';
      RETURN;
    END IF;

    -- Si el usuario no est  activo
    IF NOT v_usuario.activo THEN
      RETURN QUERY SELECT FALSE, 'Usuario inactivo';
      RETURN;
    END IF;

    -- Si tiene suspensi¢n individual
    IF NOT v_usuario.acceso_app_activo THEN
      RETURN QUERY SELECT FALSE, 'Acceso suspendido individualmente';
      RETURN;
    END IF;

    -- Verificar si tiene asignaci¢n activa en tripulacion_turno
    -- (Esto reemplaza la l¢gica de brigada_unidad que puede no existir)
    SELECT EXISTS(
      SELECT 1 FROM tripulacion_turno tt
      JOIN asignacion_unidad au ON tt.asignacion_id = au.id
      JOIN turno t ON au.turno_id = t.id
      WHERE tt.usuario_id = p_usuario_id
        AND t.estado IN ('PLANIFICADO', 'ACTIVO')
        AND (t.fecha >= CURRENT_DATE OR (t.fecha_fin IS NOT NULL AND t.fecha_fin >= CURRENT_DATE))
        AND au.hora_entrada_real IS NULL
    ) INTO v_tiene_asignacion;

    IF v_tiene_asignacion THEN
      RETURN QUERY SELECT TRUE, NULL::TEXT;
      RETURN;
    END IF;

    -- Si est  exento de grupos, tiene acceso
    IF v_usuario.exento_grupos THEN
      RETURN QUERY SELECT TRUE, NULL::TEXT;
      RETURN;
    END IF;

    -- Si no tiene grupo asignado, tiene acceso
    IF v_usuario.grupo IS NULL THEN
      RETURN QUERY SELECT TRUE, NULL::TEXT;
      RETURN;
    END IF;

    -- SIN calendario_grupo: Por defecto todos tienen acceso
    -- (Cuando implementes grupos, aqu¡ ir¡a la l¢gica de calendario)
    RETURN QUERY SELECT TRUE, NULL::TEXT;
  END;
  $$;


--
-- Name: FUNCTION verificar_acceso_app(p_usuario_id integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.verificar_acceso_app(p_usuario_id integer) IS 'Verifica acceso a la app: exentos siempre pueden, brigadas dependen de grupo y asignaci??n';


--
-- Name: verificar_inspecciones_pendientes(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verificar_inspecciones_pendientes(p_minutos_espera integer DEFAULT 30) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_inspeccion RECORD;
  v_count INTEGER := 0;
  v_alerta_existente BOOLEAN;
BEGIN
  FOR v_inspeccion IN
    SELECT i.id, i.unidad_id, u.codigo AS unidad_codigo, u.sede_id,
           i.fecha_realizacion
    FROM inspeccion_360 i
    JOIN unidad u ON i.unidad_id = u.id
    WHERE i.estado = 'PENDIENTE'
      AND i.fecha_realizacion < CURRENT_TIMESTAMP - (p_minutos_espera || ' minutes')::INTERVAL
  LOOP
    -- Verificar si ya hay alerta activa
    SELECT EXISTS (
      SELECT 1 FROM alerta
      WHERE tipo = 'INSPECCION_PENDIENTE'
        AND datos->>'inspeccion_id' = v_inspeccion.id::TEXT
        AND estado = 'ACTIVA'
    ) INTO v_alerta_existente;

    IF NOT v_alerta_existente THEN
      PERFORM crear_alerta(
        'INSPECCION_PENDIENTE',
        'Inspección 360 pendiente - Unidad ' || v_inspeccion.unidad_codigo,
        'La inspección 360 de la unidad ' || v_inspeccion.unidad_codigo ||
        ' lleva más de ' || p_minutos_espera || ' minutos esperando aprobación.',
        'MEDIA',
        jsonb_build_object(
          'inspeccion_id', v_inspeccion.id,
          'fecha_realizacion', v_inspeccion.fecha_realizacion
        ),
        v_inspeccion.sede_id,
        v_inspeccion.unidad_id,
        NULL,
        NULL,
        60 -- Expira en 1 hora
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;


--
-- Name: FUNCTION verificar_inspecciones_pendientes(p_minutos_espera integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.verificar_inspecciones_pendientes(p_minutos_espera integer) IS 'Verifica inspecciones pendientes y crea alertas';


--
-- Name: verificar_multimedia_completa(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verificar_multimedia_completa(p_situacion_id integer) RETURNS TABLE(fotos_subidas integer, fotos_requeridas integer, video_subido boolean, video_requerido boolean, multimedia_completa boolean)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_tipo_situacion VARCHAR(50);
    v_fotos INTEGER;
    v_tiene_video BOOLEAN;
BEGIN
    -- Obtener tipo de situación
    SELECT tipo_situacion INTO v_tipo_situacion
    FROM situacion WHERE id = p_situacion_id;

    -- Contar fotos y videos
    SELECT
        COUNT(*) FILTER (WHERE tipo = 'FOTO'),
        BOOL_OR(tipo = 'VIDEO')
    INTO v_fotos, v_tiene_video
    FROM situacion_multimedia
    WHERE situacion_id = p_situacion_id;

    v_tiene_video := COALESCE(v_tiene_video, false);

    -- Determinar requerimientos según tipo
    -- INCIDENTE, ASISTENCIA_VEHICULAR, EMERGENCIA requieren 3 fotos + 1 video
    IF v_tipo_situacion IN ('INCIDENTE', 'ASISTENCIA_VEHICULAR', 'EMERGENCIA') THEN
        RETURN QUERY SELECT
            v_fotos,
            3,
            v_tiene_video,
            true,
            (v_fotos >= 3 AND v_tiene_video);
    ELSE
        -- Otros tipos no requieren multimedia obligatoria
        RETURN QUERY SELECT
            v_fotos,
            0,
            v_tiene_video,
            false,
            true;
    END IF;
END;
$$;


--
-- Name: verificar_unidades_inactivas(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verificar_unidades_inactivas(p_minutos_inactividad integer DEFAULT 60) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_unidad RECORD;
  v_count INTEGER := 0;
  v_alerta_existente BOOLEAN;
BEGIN
  FOR v_unidad IN
    SELECT u.id, u.codigo, u.sede_id, su.fecha_hora_salida, su.id AS salida_id
    FROM unidad u
    JOIN salida_unidad su ON u.id = su.unidad_id
    WHERE su.fecha_hora_salida IS NOT NULL
      AND su.fecha_hora_ingreso IS NULL
      AND su.fecha_hora_salida < CURRENT_TIMESTAMP - (p_minutos_inactividad || ' minutes')::INTERVAL
      -- Sin situaciones recientes
      AND NOT EXISTS (
        SELECT 1 FROM situacion s
        WHERE s.salida_id = su.id
          AND s.fecha_hora_reporte > CURRENT_TIMESTAMP - (p_minutos_inactividad || ' minutes')::INTERVAL
      )
  LOOP
    -- Verificar si ya hay alerta activa para esta unidad
    SELECT EXISTS (
      SELECT 1 FROM alerta
      WHERE tipo = 'UNIDAD_SIN_ACTIVIDAD'
        AND unidad_id = v_unidad.id
        AND estado = 'ACTIVA'
    ) INTO v_alerta_existente;

    IF NOT v_alerta_existente THEN
      PERFORM crear_alerta(
        'UNIDAD_SIN_ACTIVIDAD',
        'Unidad ' || v_unidad.codigo || ' sin actividad',
        'La unidad ' || v_unidad.codigo || ' lleva más de ' || p_minutos_inactividad ||
        ' minutos sin reportar actividad desde que salió.',
        'MEDIA',
        jsonb_build_object(
          'salida_id', v_unidad.salida_id,
          'ultima_salida', v_unidad.fecha_hora_salida
        ),
        v_unidad.sede_id,
        v_unidad.id,
        NULL,
        NULL,
        120 -- Expira en 2 horas
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;


--
-- Name: FUNCTION verificar_unidades_inactivas(p_minutos_inactividad integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.verificar_unidades_inactivas(p_minutos_inactividad integer) IS 'Verifica unidades sin actividad y crea alertas';


--
-- Name: actividad; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.actividad (
    id bigint NOT NULL,
    tipo_actividad_id integer NOT NULL,
    unidad_id integer NOT NULL,
    salida_unidad_id integer,
    creado_por integer NOT NULL,
    ruta_id integer,
    latitud numeric(10,8),
    longitud numeric(11,8),
    km numeric(6,2),
    sentido character varying(30),
    estado character varying(20) DEFAULT 'ACTIVA'::character varying,
    observaciones text,
    datos jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    closed_at timestamp with time zone,
    codigo_actividad text
);


--
-- Name: TABLE actividad; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.actividad IS 'Actividades operativas simples (patrullaje, puesto fijo, comida, etc). Separadas de la tabla situacion que maneja hechos de tr nsito, asistencia y emergencias.';


--
-- Name: actividad_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.actividad_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: actividad_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.actividad_id_seq OWNED BY public.actividad.id;


--
-- Name: alerta_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.alerta_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: alerta_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.alerta_id_seq OWNED BY public.alerta.id;


--
-- Name: alerta_leida; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alerta_leida (
    id integer NOT NULL,
    alerta_id integer NOT NULL,
    usuario_id integer NOT NULL,
    leida_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE alerta_leida; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.alerta_leida IS 'Registro de alertas leídas por usuario';


--
-- Name: alerta_leida_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.alerta_leida_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: alerta_leida_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.alerta_leida_id_seq OWNED BY public.alerta_leida.id;


--
-- Name: aprobacion_respuesta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aprobacion_respuesta (
    id integer NOT NULL,
    aprobacion_id integer NOT NULL,
    usuario_id integer NOT NULL,
    respuesta character varying(20),
    fecha_respuesta timestamp with time zone,
    motivo_rechazo text,
    latitud numeric(10,8),
    longitud numeric(11,8),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT aprobacion_respuesta_respuesta_check CHECK (((respuesta)::text = ANY (ARRAY[('APROBADO'::character varying)::text, ('RECHAZADO'::character varying)::text, ('PENDIENTE'::character varying)::text])))
);


--
-- Name: TABLE aprobacion_respuesta; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.aprobacion_respuesta IS 'Respuestas individuales de cada tripulante a solicitudes de aprobacion';


--
-- Name: aprobacion_respuesta_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.aprobacion_respuesta_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: aprobacion_respuesta_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.aprobacion_respuesta_id_seq OWNED BY public.aprobacion_respuesta.id;


--
-- Name: aprobacion_tripulacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aprobacion_tripulacion (
    id integer NOT NULL,
    salida_id integer,
    unidad_id integer NOT NULL,
    tipo character varying(30) NOT NULL,
    inspeccion_360_id integer,
    estado character varying(20) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    requiere_todos boolean DEFAULT true,
    minimo_aprobaciones integer DEFAULT 1,
    tiempo_limite_minutos integer DEFAULT 30,
    iniciado_por integer,
    fecha_inicio timestamp with time zone DEFAULT now(),
    fecha_completada timestamp with time zone,
    observaciones text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT aprobacion_tripulacion_estado_check CHECK (((estado)::text = ANY (ARRAY[('PENDIENTE'::character varying)::text, ('COMPLETADA'::character varying)::text, ('RECHAZADA'::character varying)::text, ('CANCELADA'::character varying)::text, ('EXPIRADA'::character varying)::text]))),
    CONSTRAINT aprobacion_tripulacion_tipo_check CHECK (((tipo)::text = ANY (ARRAY[('CONFIRMAR_PRESENCIA'::character varying)::text, ('APROBAR_FIN_JORNADA'::character varying)::text, ('APROBAR_360'::character varying)::text])))
);


--
-- Name: TABLE aprobacion_tripulacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.aprobacion_tripulacion IS 'Solicitudes de aprobacion que requieren consenso de tripulacion';


--
-- Name: aprobacion_tripulacion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.aprobacion_tripulacion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: aprobacion_tripulacion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.aprobacion_tripulacion_id_seq OWNED BY public.aprobacion_tripulacion.id;


--
-- Name: articulo_sancion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.articulo_sancion (
    id integer NOT NULL,
    numero character varying(20) NOT NULL,
    descripcion text NOT NULL,
    monto_multa numeric(10,2),
    puntos_licencia integer DEFAULT 0,
    activo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE articulo_sancion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.articulo_sancion IS 'Cat??logo de art??culos de ley de tr??nsito para sanciones';


--
-- Name: articulo_sancion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.articulo_sancion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: articulo_sancion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.articulo_sancion_id_seq OWNED BY public.articulo_sancion.id;


--
-- Name: aseguradora; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aseguradora (
    id integer NOT NULL,
    nombre character varying(255) NOT NULL,
    telefono character varying(50),
    activa boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tipo_licencia character varying(50),
    vehiculo_id integer,
    empresa text
);


--
-- Name: TABLE aseguradora; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.aseguradora IS 'Tabla maestra de aseguradoras. Cat??logo reutilizable.';


--
-- Name: aseguradora_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.aseguradora_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: aseguradora_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.aseguradora_id_seq OWNED BY public.aseguradora.id;


--
-- Name: asignacion_unidad; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asignacion_unidad (
    id integer NOT NULL,
    turno_id integer NOT NULL,
    unidad_id integer,
    ruta_id integer,
    km_inicio numeric(10,2),
    km_final numeric(10,2),
    sentido character varying(30),
    acciones text,
    combustible_inicial numeric(5,2),
    combustible_asignado numeric(5,2),
    hora_salida time without time zone,
    hora_entrada_estimada time without time zone,
    hora_salida_real timestamp with time zone,
    hora_entrada_real timestamp with time zone,
    combustible_final numeric(5,2),
    km_recorridos numeric(10,2),
    observaciones_finales text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    dia_cerrado boolean DEFAULT false,
    fecha_cierre timestamp with time zone,
    cerrado_por integer,
    modificado_despues_cierre boolean DEFAULT false,
    motivo_modificacion_cierre text,
    ruta_activa_id integer,
    hora_ultima_actualizacion_ruta timestamp with time zone,
    notificacion_enviada boolean DEFAULT false,
    fecha_notificacion timestamp with time zone,
    es_reaccion boolean DEFAULT false,
    situacion_fija_id integer,
    acciones_formato text,
    tipo_asignacion character varying(50) DEFAULT 'PATRULLA'::character varying,
    estado_nomina character varying(20) DEFAULT 'BORRADOR'::character varying,
    CONSTRAINT asignacion_unidad_estado_nomina_check CHECK (((estado_nomina)::text = ANY ((ARRAY['BORRADOR'::character varying, 'LIBERADA'::character varying])::text[]))),
    CONSTRAINT asignacion_unidad_sentido_check CHECK (((sentido)::text = ANY (ARRAY[('NORTE'::character varying)::text, ('SUR'::character varying)::text, ('ORIENTE'::character varying)::text, ('OCCIDENTE'::character varying)::text])))
);


--
-- Name: TABLE asignacion_unidad; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.asignacion_unidad IS 'Asignaci??n de unidades a rutas/zonas por turno';


--
-- Name: COLUMN asignacion_unidad.sentido; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.asignacion_unidad.sentido IS 'Sentido de recorrido: NORTE, SUR, ORIENTE, OCCIDENTE';


--
-- Name: COLUMN asignacion_unidad.acciones; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.asignacion_unidad.acciones IS 'Instrucciones espec??ficas para la unidad en este turno';


--
-- Name: COLUMN asignacion_unidad.km_recorridos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.asignacion_unidad.km_recorridos IS 'Kilometraje recorrido durante el turno';


--
-- Name: COLUMN asignacion_unidad.dia_cerrado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.asignacion_unidad.dia_cerrado IS 'True si el d??a operativo de esta asignaci??n ya fue cerrado';


--
-- Name: COLUMN asignacion_unidad.fecha_cierre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.asignacion_unidad.fecha_cierre IS 'Timestamp de cu??ndo se cerr?? el d??a';


--
-- Name: COLUMN asignacion_unidad.cerrado_por; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.asignacion_unidad.cerrado_por IS 'Usuario que cerr?? el d??a (autom??tico o manual)';


--
-- Name: COLUMN asignacion_unidad.modificado_despues_cierre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.asignacion_unidad.modificado_despues_cierre IS 'True si fue modificado despu??s de que el d??a fue cerrado';


--
-- Name: COLUMN asignacion_unidad.motivo_modificacion_cierre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.asignacion_unidad.motivo_modificacion_cierre IS 'Motivo de la modificaci??n post-cierre';


--
-- Name: COLUMN asignacion_unidad.ruta_activa_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.asignacion_unidad.ruta_activa_id IS 'Ruta actualmente activa para esta asignación (se define en SALIDA_SEDE o CAMBIO_RUTA)';


--
-- Name: COLUMN asignacion_unidad.hora_ultima_actualizacion_ruta; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.asignacion_unidad.hora_ultima_actualizacion_ruta IS 'Última vez que se actualizó la ruta activa';


--
-- Name: COLUMN asignacion_unidad.notificacion_enviada; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.asignacion_unidad.notificacion_enviada IS 'Si ya se notific?? a la tripulaci??n de esta asignaci??n';


--
-- Name: COLUMN asignacion_unidad.es_reaccion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.asignacion_unidad.es_reaccion IS 'Indica si la unidad es de reaccion (sin ruta fija inicial)';


--
-- Name: COLUMN asignacion_unidad.acciones_formato; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.asignacion_unidad.acciones_formato IS 'Acciones con formato HTML básico (negrita, colores)';


--
-- Name: COLUMN asignacion_unidad.estado_nomina; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.asignacion_unidad.estado_nomina IS 'Estado de la n¢mina: BORRADOR (no visible en app m¢vil) o LIBERADA (visible y notificada)';


--
-- Name: asignacion_unidad_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.asignacion_unidad_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: asignacion_unidad_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.asignacion_unidad_id_seq OWNED BY public.asignacion_unidad.id;


--
-- Name: auditoria_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auditoria_log (
    id bigint NOT NULL,
    usuario_id integer,
    accion character varying(50) NOT NULL,
    tabla_afectada character varying(100),
    registro_id bigint,
    datos_anteriores jsonb,
    datos_nuevos jsonb,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT auditoria_log_accion_check CHECK (((accion)::text = ANY (ARRAY[('INSERT'::character varying)::text, ('UPDATE'::character varying)::text, ('DELETE'::character varying)::text, ('LOGIN'::character varying)::text, ('LOGOUT'::character varying)::text, ('EXPORT'::character varying)::text, ('OTHER'::character varying)::text])))
);


--
-- Name: TABLE auditoria_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.auditoria_log IS 'Log de auditor??a de todas las acciones importantes del sistema';


--
-- Name: COLUMN auditoria_log.datos_anteriores; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auditoria_log.datos_anteriores IS 'Estado del registro antes del cambio';


--
-- Name: COLUMN auditoria_log.datos_nuevos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auditoria_log.datos_nuevos IS 'Estado del registro despu??s del cambio';


--
-- Name: auditoria_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.auditoria_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: auditoria_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.auditoria_log_id_seq OWNED BY public.auditoria_log.id;


--
-- Name: autoridad; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.autoridad (
    id integer NOT NULL,
    situacion_id integer NOT NULL,
    tipo character varying(50) NOT NULL,
    hora_llegada timestamp with time zone,
    hora_salida timestamp with time zone,
    datos jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: autoridad_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.autoridad_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: autoridad_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.autoridad_id_seq OWNED BY public.autoridad.id;


--
-- Name: aviso_asignacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aviso_asignacion (
    id integer NOT NULL,
    asignacion_id integer NOT NULL,
    tipo character varying(30) NOT NULL,
    mensaje text NOT NULL,
    color character varying(7) DEFAULT '#f59e0b'::character varying,
    creado_por integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE aviso_asignacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.aviso_asignacion IS 'Avisos/advertencias especiales en asignaciones';


--
-- Name: aviso_asignacion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.aviso_asignacion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: aviso_asignacion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.aviso_asignacion_id_seq OWNED BY public.aviso_asignacion.id;


--
-- Name: bitacora_historica; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bitacora_historica (
    id bigint NOT NULL,
    fecha date NOT NULL,
    unidad_id integer NOT NULL,
    salida_id integer,
    sede_origen_id integer,
    ruta_inicial_id integer,
    km_inicial numeric(10,2),
    km_final numeric(10,2),
    km_recorridos numeric(10,2),
    combustible_inicial numeric(5,2),
    combustible_final numeric(5,2),
    hora_inicio timestamp with time zone NOT NULL,
    hora_fin timestamp with time zone,
    duracion_minutos integer,
    tripulacion_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    situaciones_resumen jsonb DEFAULT '[]'::jsonb NOT NULL,
    total_situaciones integer DEFAULT 0,
    ingresos_resumen jsonb DEFAULT '[]'::jsonb NOT NULL,
    total_ingresos integer DEFAULT 0,
    total_incidentes integer DEFAULT 0,
    total_asistencias integer DEFAULT 0,
    total_emergencias integer DEFAULT 0,
    total_regulaciones integer DEFAULT 0,
    total_patrullajes integer DEFAULT 0,
    observaciones_inicio text,
    observaciones_fin text,
    finalizado_por integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
)
PARTITION BY RANGE (fecha);


--
-- Name: TABLE bitacora_historica; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.bitacora_historica IS 'Tabla histórica optimizada para almacenar años de jornadas laborales finalizadas';


--
-- Name: COLUMN bitacora_historica.tripulacion_ids; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bitacora_historica.tripulacion_ids IS 'Array de referencias a usuarios, formato: [{"usuario_id": X, "rol": "PILOTO"}]';


--
-- Name: COLUMN bitacora_historica.situaciones_resumen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bitacora_historica.situaciones_resumen IS 'Resumen compacto de situaciones del día, solo IDs y datos esenciales';


--
-- Name: COLUMN bitacora_historica.ingresos_resumen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bitacora_historica.ingresos_resumen IS 'Resumen compacto de ingresos a sede del día';


--
-- Name: bitacora_historica_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bitacora_historica_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bitacora_historica_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bitacora_historica_id_seq OWNED BY public.bitacora_historica.id;


--
-- Name: bitacora_historica_2024; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bitacora_historica_2024 (
    id bigint DEFAULT nextval('public.bitacora_historica_id_seq'::regclass) NOT NULL,
    fecha date NOT NULL,
    unidad_id integer NOT NULL,
    salida_id integer,
    sede_origen_id integer,
    ruta_inicial_id integer,
    km_inicial numeric(10,2),
    km_final numeric(10,2),
    km_recorridos numeric(10,2),
    combustible_inicial numeric(5,2),
    combustible_final numeric(5,2),
    hora_inicio timestamp with time zone NOT NULL,
    hora_fin timestamp with time zone,
    duracion_minutos integer,
    tripulacion_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    situaciones_resumen jsonb DEFAULT '[]'::jsonb NOT NULL,
    total_situaciones integer DEFAULT 0,
    ingresos_resumen jsonb DEFAULT '[]'::jsonb NOT NULL,
    total_ingresos integer DEFAULT 0,
    total_incidentes integer DEFAULT 0,
    total_asistencias integer DEFAULT 0,
    total_emergencias integer DEFAULT 0,
    total_regulaciones integer DEFAULT 0,
    total_patrullajes integer DEFAULT 0,
    observaciones_inicio text,
    observaciones_fin text,
    finalizado_por integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: bitacora_historica_2025; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bitacora_historica_2025 (
    id bigint DEFAULT nextval('public.bitacora_historica_id_seq'::regclass) NOT NULL,
    fecha date NOT NULL,
    unidad_id integer NOT NULL,
    salida_id integer,
    sede_origen_id integer,
    ruta_inicial_id integer,
    km_inicial numeric(10,2),
    km_final numeric(10,2),
    km_recorridos numeric(10,2),
    combustible_inicial numeric(5,2),
    combustible_final numeric(5,2),
    hora_inicio timestamp with time zone NOT NULL,
    hora_fin timestamp with time zone,
    duracion_minutos integer,
    tripulacion_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    situaciones_resumen jsonb DEFAULT '[]'::jsonb NOT NULL,
    total_situaciones integer DEFAULT 0,
    ingresos_resumen jsonb DEFAULT '[]'::jsonb NOT NULL,
    total_ingresos integer DEFAULT 0,
    total_incidentes integer DEFAULT 0,
    total_asistencias integer DEFAULT 0,
    total_emergencias integer DEFAULT 0,
    total_regulaciones integer DEFAULT 0,
    total_patrullajes integer DEFAULT 0,
    observaciones_inicio text,
    observaciones_fin text,
    finalizado_por integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: bitacora_historica_2026; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bitacora_historica_2026 (
    id bigint DEFAULT nextval('public.bitacora_historica_id_seq'::regclass) NOT NULL,
    fecha date NOT NULL,
    unidad_id integer NOT NULL,
    salida_id integer,
    sede_origen_id integer,
    ruta_inicial_id integer,
    km_inicial numeric(10,2),
    km_final numeric(10,2),
    km_recorridos numeric(10,2),
    combustible_inicial numeric(5,2),
    combustible_final numeric(5,2),
    hora_inicio timestamp with time zone NOT NULL,
    hora_fin timestamp with time zone,
    duracion_minutos integer,
    tripulacion_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    situaciones_resumen jsonb DEFAULT '[]'::jsonb NOT NULL,
    total_situaciones integer DEFAULT 0,
    ingresos_resumen jsonb DEFAULT '[]'::jsonb NOT NULL,
    total_ingresos integer DEFAULT 0,
    total_incidentes integer DEFAULT 0,
    total_asistencias integer DEFAULT 0,
    total_emergencias integer DEFAULT 0,
    total_regulaciones integer DEFAULT 0,
    total_patrullajes integer DEFAULT 0,
    observaciones_inicio text,
    observaciones_fin text,
    finalizado_por integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: boleta_secuencia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.boleta_secuencia (
    sede_id integer NOT NULL,
    anio integer NOT NULL,
    ultimo integer DEFAULT 0 NOT NULL
);


--
-- Name: TABLE boleta_secuencia; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.boleta_secuencia IS 'Secuencias atÃ³micas para generaciÃ³n de boletas. Previene colisiones en concurrencia.';


--
-- Name: brigada; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brigada (
    id integer NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    sede_id integer NOT NULL,
    activa boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    fecha_nacimiento date,
    licencia_tipo character varying(5),
    licencia_numero character varying(30),
    licencia_vencimiento date,
    telefono character varying(20),
    email character varying(100),
    direccion text,
    contacto_emergencia character varying(150),
    telefono_emergencia character varying(20),
    usuario_id integer
);


--
-- Name: TABLE brigada; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.brigada IS 'Brigadas de trabajo';


--
-- Name: brigada_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.brigada_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: brigada_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.brigada_id_seq OWNED BY public.brigada.id;


--
-- Name: bus; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bus (
    id integer NOT NULL,
    vehiculo_id integer NOT NULL,
    empresa character varying(255),
    ruta_bus character varying(100),
    numero_unidad character varying(50),
    capacidad_pasajeros integer,
    fecha_registro timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    licencia_transportes character varying(15),
    tarjeta_operaciones character varying(30),
    seguro character varying(80),
    poliza character varying(30)
);


--
-- Name: TABLE bus; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.bus IS 'Datos de buses extraurbanos vinculados a veh??culos';


--
-- Name: bus_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bus_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bus_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bus_id_seq OWNED BY public.bus.id;


--
-- Name: campo_personalizado; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campo_personalizado (
    id integer NOT NULL,
    tabla_destino character varying(50) NOT NULL,
    clave character varying(50) NOT NULL,
    etiqueta character varying(100) NOT NULL,
    tipo character varying(20) DEFAULT 'text'::character varying,
    opciones jsonb,
    orden integer DEFAULT 0,
    activo boolean DEFAULT true,
    creado_por integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: campo_personalizado_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.campo_personalizado_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: campo_personalizado_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.campo_personalizado_id_seq OWNED BY public.campo_personalizado.id;


--
-- Name: capa_mapa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.capa_mapa (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    color character varying(7) DEFAULT '#3B82F6'::character varying,
    icono character varying(50) DEFAULT 'map-pin'::character varying,
    visible boolean DEFAULT true,
    orden integer DEFAULT 0,
    created_by integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    activo boolean DEFAULT true
);


--
-- Name: capa_mapa_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.capa_mapa_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: capa_mapa_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.capa_mapa_id_seq OWNED BY public.capa_mapa.id;


--
-- Name: catalogo_motivo_inactividad; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.catalogo_motivo_inactividad (
    id integer NOT NULL,
    codigo character varying(50) NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    requiere_fecha_fin boolean DEFAULT false,
    activo boolean DEFAULT true,
    orden integer DEFAULT 0
);


--
-- Name: TABLE catalogo_motivo_inactividad; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.catalogo_motivo_inactividad IS 'Catálogo de motivos de inactividad/desactivación';


--
-- Name: catalogo_motivo_inactividad_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.catalogo_motivo_inactividad_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: catalogo_motivo_inactividad_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.catalogo_motivo_inactividad_id_seq OWNED BY public.catalogo_motivo_inactividad.id;


--
-- Name: catalogo_tipo_situacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.catalogo_tipo_situacion (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    icono character varying(50),
    formulario_tipo character varying(50),
    activo boolean DEFAULT true,
    categoria text,
    color text DEFAULT '#6B7280'::text
);


--
-- Name: catalogo_tipo_situacion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.catalogo_tipo_situacion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: catalogo_tipo_situacion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.catalogo_tipo_situacion_id_seq OWNED BY public.catalogo_tipo_situacion.id;


--
-- Name: causa_hecho_transito; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.causa_hecho_transito (
    id integer NOT NULL,
    codigo character varying(30) NOT NULL,
    nombre character varying(100) NOT NULL,
    orden integer DEFAULT 0 NOT NULL,
    activo boolean DEFAULT true NOT NULL
);


--
-- Name: TABLE causa_hecho_transito; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.causa_hecho_transito IS 'Catálogo de 23 causas de hechos de tránsito según boleta UAV-205-13';


--
-- Name: causa_hecho_transito_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.causa_hecho_transito_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: causa_hecho_transito_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.causa_hecho_transito_id_seq OWNED BY public.causa_hecho_transito.id;


--
-- Name: combustible_registro; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.combustible_registro (
    id bigint NOT NULL,
    unidad_id integer NOT NULL,
    asignacion_id integer,
    turno_id integer,
    tipo character varying(30) NOT NULL,
    combustible_anterior numeric(6,2) NOT NULL,
    combustible_nuevo numeric(6,2) NOT NULL,
    odometro_anterior numeric(10,2),
    odometro_actual numeric(10,2),
    km_recorridos numeric(8,2),
    observaciones text,
    registrado_por integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    nivel_anterior character varying(10),
    nivel_nuevo character varying(10),
    CONSTRAINT combustible_registro_tipo_check CHECK (((tipo)::text = ANY (ARRAY[('INICIAL'::character varying)::text, ('RECARGA'::character varying)::text, ('FINAL'::character varying)::text, ('AJUSTE'::character varying)::text])))
);


--
-- Name: TABLE combustible_registro; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.combustible_registro IS 'Historial detallado de combustible por unidad y turno';


--
-- Name: COLUMN combustible_registro.tipo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.combustible_registro.tipo IS 'INICIAL: al iniciar turno | RECARGA: durante turno | FINAL: al terminar turno | AJUSTE: correcci??n manual';


--
-- Name: combustible_registro_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.combustible_registro_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: combustible_registro_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.combustible_registro_id_seq OWNED BY public.combustible_registro.id;


--
-- Name: configuracion_alerta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.configuracion_alerta (
    id integer NOT NULL,
    tipo public.tipo_alerta NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    severidad_default public.severidad_alerta DEFAULT 'MEDIA'::public.severidad_alerta,
    activa boolean DEFAULT true,
    tiempo_inactividad_minutos integer DEFAULT 60,
    umbral_combustible numeric(5,2) DEFAULT 20.00,
    umbral_km integer DEFAULT 5000,
    notificar_push boolean DEFAULT true,
    notificar_email boolean DEFAULT false,
    notificar_sms boolean DEFAULT false,
    roles_destino text[] DEFAULT ARRAY['COP'::text, 'OPERACIONES'::text, 'ADMIN'::text],
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE configuracion_alerta; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.configuracion_alerta IS 'Configuración de tipos de alerta';


--
-- Name: configuracion_alerta_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.configuracion_alerta_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: configuracion_alerta_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.configuracion_alerta_id_seq OWNED BY public.configuracion_alerta.id;


--
-- Name: configuracion_columnas_tabla; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.configuracion_columnas_tabla (
    id integer NOT NULL,
    sede_id integer,
    tabla_nombre character varying(50) NOT NULL,
    columnas_visibles jsonb DEFAULT '[]'::jsonb NOT NULL,
    orden_columnas text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    creado_por integer
);


--
-- Name: TABLE configuracion_columnas_tabla; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.configuracion_columnas_tabla IS 'Configuracion de columnas visibles por sede para tablas de brigadas y unidades.

COLUMNAS DISPONIBLES BRIGADAS:
- chapa: Numero de identificacion
- nombre: Nombre completo
- rol_brigada: Rol (PILOTO, COPILOTO, ACOMPANANTE)
- grupo: Grupo de trabajo (0, 1, 2)
- sede: Sede asignada
- telefono: Numero de telefono
- email: Correo electronico
- estado: Activo/Inactivo
- created_at: Fecha de creacion
- ultimo_acceso: Ultimo acceso al sistema

COLUMNAS DISPONIBLES UNIDADES:
- codigo: Codigo de la unidad
- tipo_unidad: Tipo (MOTORIZADA, PICKUP, etc.)
- marca: Marca del vehiculo
- modelo: Modelo del vehiculo
- anio: Anio del vehiculo
- placa: Numero de placa
- sede: Sede asignada
- estado: Activo/Inactivo
- created_at: Fecha de creacion
';


--
-- Name: configuracion_columnas_tabla_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.configuracion_columnas_tabla_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: configuracion_columnas_tabla_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.configuracion_columnas_tabla_id_seq OWNED BY public.configuracion_columnas_tabla.id;


--
-- Name: configuracion_sistema; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.configuracion_sistema (
    id integer NOT NULL,
    clave character varying(100) NOT NULL,
    valor text,
    tipo character varying(20) DEFAULT 'string'::character varying,
    descripcion text,
    categoria character varying(50) DEFAULT 'general'::character varying,
    modificado_por integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: configuracion_sistema_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.configuracion_sistema_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: configuracion_sistema_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.configuracion_sistema_id_seq OWNED BY public.configuracion_sistema.id;


--
-- Name: configuracion_visual_sede; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.configuracion_visual_sede (
    id integer NOT NULL,
    sede_id integer NOT NULL,
    color_fondo character varying(7) DEFAULT '#ffffff'::character varying,
    color_fondo_header character varying(7) DEFAULT '#f3f4f6'::character varying,
    color_texto character varying(7) DEFAULT '#1f2937'::character varying,
    color_acento character varying(7) DEFAULT '#3b82f6'::character varying,
    fuente character varying(50) DEFAULT 'Inter'::character varying,
    tamano_fuente character varying(10) DEFAULT 'normal'::character varying,
    alerta_rotacion_rutas_activa boolean DEFAULT true,
    umbral_rotacion_rutas integer DEFAULT 3,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    requiere_tripulacion boolean DEFAULT true
);


--
-- Name: TABLE configuracion_visual_sede; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.configuracion_visual_sede IS 'Personalización visual del dashboard por sede';


--
-- Name: configuracion_visual_sede_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.configuracion_visual_sede_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: configuracion_visual_sede_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.configuracion_visual_sede_id_seq OWNED BY public.configuracion_visual_sede.id;


--
-- Name: contenedor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contenedor (
    id integer NOT NULL,
    vehiculo_id integer NOT NULL,
    numero_contenedor character varying(50),
    linea_naviera character varying(100),
    tipo_contenedor character varying(50),
    fecha_registro timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE contenedor; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.contenedor IS 'Datos de contenedores/remolques vinculados a veh??culos';


--
-- Name: contenedor_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.contenedor_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contenedor_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.contenedor_id_seq OWNED BY public.contenedor.id;


--
-- Name: control_acceso_app; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.control_acceso_app (
    id integer NOT NULL,
    usuario_id integer,
    grupo smallint,
    unidad_id integer,
    sede_id integer,
    acceso_permitido boolean DEFAULT true NOT NULL,
    motivo text,
    fecha_inicio date NOT NULL,
    fecha_fin date,
    creado_por integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT control_acceso_app_check CHECK (((usuario_id IS NOT NULL) OR (grupo IS NOT NULL) OR (unidad_id IS NOT NULL) OR (sede_id IS NOT NULL))),
    CONSTRAINT control_acceso_app_grupo_check CHECK ((grupo = ANY (ARRAY[1, 2])))
);


--
-- Name: control_acceso_app_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.control_acceso_app_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: control_acceso_app_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.control_acceso_app_id_seq OWNED BY public.control_acceso_app.id;


--
-- Name: debug_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.debug_log (
    id integer NOT NULL,
    fecha timestamp without time zone DEFAULT now(),
    origen text,
    unidad_id integer,
    datos_recibidos jsonb
);


--
-- Name: debug_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.debug_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: debug_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.debug_log_id_seq OWNED BY public.debug_log.id;


--
-- Name: departamento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departamento (
    id integer NOT NULL,
    codigo character varying(2) NOT NULL,
    nombre character varying(100) NOT NULL,
    nombre_completo character varying(150),
    region character varying(50),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE departamento; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.departamento IS 'Departamentos de Guatemala (22 total)';


--
-- Name: COLUMN departamento.codigo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.departamento.codigo IS 'C??digo oficial del departamento (01-22)';


--
-- Name: COLUMN departamento.region; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.departamento.region IS 'Regi??n geogr??fica a la que pertenece';


--
-- Name: departamento_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.departamento_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: departamento_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.departamento_id_seq OWNED BY public.departamento.id;


--
-- Name: departamento_sistema; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departamento_sistema (
    id integer NOT NULL,
    codigo character varying(30) NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    usa_sistema_grupos boolean DEFAULT true,
    orden integer DEFAULT 0,
    activo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: departamento_sistema_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.departamento_sistema_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: departamento_sistema_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.departamento_sistema_id_seq OWNED BY public.departamento_sistema.id;


--
-- Name: dispositivo_autorizado; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dispositivo_autorizado (
    id integer NOT NULL,
    device_id character varying(255) NOT NULL,
    usuario_id integer,
    device_model character varying(255),
    device_os character varying(100),
    device_os_version character varying(50),
    app_version character varying(50),
    estado character varying(20) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    notas text,
    aprobado_por integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    ultimo_acceso_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_dispositivo_estado CHECK (((estado)::text = ANY ((ARRAY['PENDIENTE'::character varying, 'APROBADO'::character varying, 'BLOQUEADO'::character varying])::text[])))
);


--
-- Name: TABLE dispositivo_autorizado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.dispositivo_autorizado IS 'Registro de dispositivos m¢viles que intentaron acceder al sistema. Control de acceso activable con env DEVICE_AUTH_ENABLED=true.';


--
-- Name: dispositivo_autorizado_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dispositivo_autorizado_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dispositivo_autorizado_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dispositivo_autorizado_id_seq OWNED BY public.dispositivo_autorizado.id;


--
-- Name: dispositivo_push; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dispositivo_push (
    id integer NOT NULL,
    usuario_id integer NOT NULL,
    push_token character varying(255) NOT NULL,
    plataforma character varying(20) NOT NULL,
    modelo_dispositivo character varying(100),
    version_app character varying(20),
    activo boolean DEFAULT true,
    ultimo_uso timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT dispositivo_push_plataforma_check CHECK (((plataforma)::text = ANY (ARRAY[('ios'::character varying)::text, ('android'::character varying)::text, ('web'::character varying)::text])))
);


--
-- Name: TABLE dispositivo_push; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.dispositivo_push IS 'Tokens de dispositivos para notificaciones push (Expo Push Notifications)';


--
-- Name: dispositivo_push_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dispositivo_push_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dispositivo_push_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dispositivo_push_id_seq OWNED BY public.dispositivo_push.id;


--
-- Name: dispositivo_seguridad; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dispositivo_seguridad (
    id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    orden integer DEFAULT 0 NOT NULL
);


--
-- Name: dispositivo_seguridad_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dispositivo_seguridad_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dispositivo_seguridad_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dispositivo_seguridad_id_seq OWNED BY public.dispositivo_seguridad.id;


--
-- Name: estado_grupo_departamento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estado_grupo_departamento (
    id integer NOT NULL,
    departamento_id integer NOT NULL,
    sede_id integer,
    grupo smallint NOT NULL,
    activo boolean DEFAULT true,
    modificado_por integer,
    fecha_modificacion timestamp with time zone DEFAULT now(),
    observaciones text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT estado_grupo_departamento_grupo_check CHECK ((grupo = ANY (ARRAY[0, 1, 2])))
);


--
-- Name: estado_grupo_departamento_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.estado_grupo_departamento_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: estado_grupo_departamento_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.estado_grupo_departamento_id_seq OWNED BY public.estado_grupo_departamento.id;


--
-- Name: estado_via; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estado_via (
    id integer NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(30) NOT NULL,
    orden integer DEFAULT 0 NOT NULL
);


--
-- Name: estado_via_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.estado_via_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: estado_via_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.estado_via_id_seq OWNED BY public.estado_via.id;


--
-- Name: etnia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.etnia (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    activo boolean DEFAULT true
);


--
-- Name: etnia_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.etnia_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: etnia_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.etnia_id_seq OWNED BY public.etnia.id;


--
-- Name: geometria_via; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.geometria_via (
    id integer NOT NULL,
    codigo character varying(30) NOT NULL,
    nombre character varying(50) NOT NULL,
    orden integer DEFAULT 0 NOT NULL
);


--
-- Name: geometria_via_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.geometria_via_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: geometria_via_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.geometria_via_id_seq OWNED BY public.geometria_via.id;


--
-- Name: grua; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grua (
    id integer NOT NULL,
    nombre character varying(255) NOT NULL,
    placa character varying(20),
    telefono character varying(50),
    empresa character varying(255),
    total_servicios integer DEFAULT 0,
    ultima_vez_usado timestamp with time zone,
    activa boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    ruta_id integer,
    tipo_grua character varying(50),
    rango_km character varying(100),
    tipos_vehiculo text[]
);


--
-- Name: TABLE grua; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.grua IS 'Tabla maestra de gr??as. Cat??logo reutilizable.';


--
-- Name: grua_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.grua_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: grua_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.grua_id_seq OWNED BY public.grua.id;


--
-- Name: historial_encargado_sede_grupo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.historial_encargado_sede_grupo (
    id integer NOT NULL,
    usuario_id integer NOT NULL,
    sede_id integer NOT NULL,
    grupo smallint NOT NULL,
    fecha_inicio date DEFAULT CURRENT_DATE NOT NULL,
    fecha_fin date,
    asignado_por integer,
    removido_por integer,
    motivo_asignacion text,
    motivo_remocion text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT historial_encargado_sede_grupo_grupo_check CHECK ((grupo = ANY (ARRAY[0, 1, 2])))
);


--
-- Name: historial_encargado_sede_grupo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.historial_encargado_sede_grupo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: historial_encargado_sede_grupo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.historial_encargado_sede_grupo_id_seq OWNED BY public.historial_encargado_sede_grupo.id;


--
-- Name: historial_ruta_brigada; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.historial_ruta_brigada (
    id integer NOT NULL,
    usuario_id integer NOT NULL,
    ruta_id integer NOT NULL,
    fecha date NOT NULL,
    turno_id integer,
    asignacion_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE historial_ruta_brigada; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.historial_ruta_brigada IS 'Historial para alertas de rotación de rutas';


--
-- Name: historial_ruta_brigada_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.historial_ruta_brigada_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: historial_ruta_brigada_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.historial_ruta_brigada_id_seq OWNED BY public.historial_ruta_brigada.id;


--
-- Name: historial_situacion_brigada; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.historial_situacion_brigada (
    id integer NOT NULL,
    usuario_id integer NOT NULL,
    situacion_fija_id integer NOT NULL,
    fecha date NOT NULL,
    turno_id integer,
    asignacion_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE historial_situacion_brigada; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.historial_situacion_brigada IS 'Historial para alertas de rotación de situaciones';


--
-- Name: historial_situacion_brigada_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.historial_situacion_brigada_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: historial_situacion_brigada_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.historial_situacion_brigada_id_seq OWNED BY public.historial_situacion_brigada.id;


--
-- Name: idempotency_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.idempotency_keys (
    key uuid NOT NULL,
    endpoint character varying(500) NOT NULL,
    request_body_hash character varying(64),
    response_status integer NOT NULL,
    response_json jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    expires_at timestamp without time zone DEFAULT (now() + '24:00:00'::interval)
);


--
-- Name: TABLE idempotency_keys; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.idempotency_keys IS 'Cache de respuestas para reintentos idempotentes';


--
-- Name: COLUMN idempotency_keys.key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.idempotency_keys.key IS 'UUID enviado en header Idempotency-Key';


--
-- Name: COLUMN idempotency_keys.endpoint; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.idempotency_keys.endpoint IS 'Ruta del endpoint llamado';


--
-- Name: COLUMN idempotency_keys.response_json; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.idempotency_keys.response_json IS 'Respuesta original cacheada';


--
-- Name: ingreso_sede; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ingreso_sede (
    id integer NOT NULL,
    salida_unidad_id integer NOT NULL,
    sede_id integer NOT NULL,
    fecha_hora_ingreso timestamp with time zone DEFAULT now() NOT NULL,
    fecha_hora_salida timestamp with time zone,
    tipo_ingreso character varying(30) NOT NULL,
    km_ingreso integer,
    combustible_ingreso numeric(5,2),
    km_salida_nueva integer,
    combustible_salida_nueva numeric(5,2),
    observaciones_ingreso text,
    observaciones_salida text,
    es_ingreso_final boolean DEFAULT false NOT NULL,
    registrado_por integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ingreso_sede_tipo_ingreso_check CHECK (((tipo_ingreso)::text = ANY (ARRAY[('COMBUSTIBLE'::character varying)::text, ('COMISION'::character varying)::text, ('APOYO'::character varying)::text, ('ALMUERZO'::character varying)::text, ('MANTENIMIENTO'::character varying)::text, ('FINALIZACION'::character varying)::text, ('FINALIZAR_JORNADA'::character varying)::text, ('FINALIZACION_JORNADA'::character varying)::text, ('INGRESO_TEMPORAL'::character varying)::text])))
);


--
-- Name: TABLE ingreso_sede; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ingreso_sede IS 'Ingresos de unidades a sedes durante una salida. Puede haber m??ltiples ingresos por salida.';


--
-- Name: COLUMN ingreso_sede.fecha_hora_salida; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ingreso_sede.fecha_hora_salida IS 'NULL si todav??a est?? ingresado, timestamp si volvi?? a salir';


--
-- Name: COLUMN ingreso_sede.tipo_ingreso; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ingreso_sede.tipo_ingreso IS 'Motivo del ingreso a sede';


--
-- Name: COLUMN ingreso_sede.es_ingreso_final; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ingreso_sede.es_ingreso_final IS 'TRUE si es el ingreso que finaliza la jornada laboral';


--
-- Name: ingreso_sede_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ingreso_sede_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ingreso_sede_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ingreso_sede_id_seq OWNED BY public.ingreso_sede.id;


--
-- Name: inspeccion_360; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inspeccion_360 (
    id integer NOT NULL,
    salida_id integer,
    unidad_id integer NOT NULL,
    plantilla_id integer NOT NULL,
    realizado_por integer NOT NULL,
    aprobado_por integer,
    estado character varying(20) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    fecha_realizacion timestamp with time zone DEFAULT now() NOT NULL,
    fecha_aprobacion timestamp with time zone,
    respuestas jsonb NOT NULL,
    observaciones_inspector text,
    observaciones_comandante text,
    motivo_rechazo text,
    firma_inspector text,
    firma_comandante text,
    fotos jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT inspeccion_360_estado_check CHECK (((estado)::text = ANY (ARRAY[('PENDIENTE'::character varying)::text, ('APROBADA'::character varying)::text, ('RECHAZADA'::character varying)::text])))
);


--
-- Name: TABLE inspeccion_360; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.inspeccion_360 IS 'Registro de inspecciones 360 realizadas. Cada salida requiere una inspección aprobada.';


--
-- Name: COLUMN inspeccion_360.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inspeccion_360.estado IS 'PENDIENTE = esperando aprobación | APROBADA = comandante aprobó | RECHAZADA = comandante rechazó';


--
-- Name: COLUMN inspeccion_360.respuestas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inspeccion_360.respuestas IS 'Respuestas a cada item del formulario';


--
-- Name: inspeccion_360_archivo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inspeccion_360_archivo (
    id integer NOT NULL,
    inspeccion_id integer NOT NULL,
    unidad_id integer NOT NULL,
    fecha_realizacion timestamp with time zone NOT NULL,
    estado character varying(20) NOT NULL,
    datos_comprimidos bytea NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE inspeccion_360_archivo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.inspeccion_360_archivo IS 'Archivo de inspecciones 360 antiguas (>90 dias) comprimidas';


--
-- Name: inspeccion_360_archivo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inspeccion_360_archivo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inspeccion_360_archivo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inspeccion_360_archivo_id_seq OWNED BY public.inspeccion_360_archivo.id;


--
-- Name: inspeccion_360_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inspeccion_360_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inspeccion_360_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inspeccion_360_id_seq OWNED BY public.inspeccion_360.id;


--
-- Name: intelligence_refresh_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.intelligence_refresh_log (
    id integer NOT NULL,
    view_name character varying(100) NOT NULL,
    refreshed_at timestamp with time zone DEFAULT now() NOT NULL,
    duration_ms integer,
    rows_affected integer
);


--
-- Name: TABLE intelligence_refresh_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.intelligence_refresh_log IS 'Log de refrescos de vistas materializadas';


--
-- Name: intelligence_refresh_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.intelligence_refresh_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: intelligence_refresh_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.intelligence_refresh_log_id_seq OWNED BY public.intelligence_refresh_log.id;


--
-- Name: log_administracion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.log_administracion (
    id integer NOT NULL,
    accion character varying(50) NOT NULL,
    tabla_afectada character varying(50),
    registro_id integer,
    usuario_afectado_id integer,
    datos_anteriores jsonb,
    datos_nuevos jsonb,
    realizado_por integer NOT NULL,
    ip_address character varying(45),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: log_administracion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.log_administracion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: log_administracion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.log_administracion_id_seq OWNED BY public.log_administracion.id;


--
-- Name: marca; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marca (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    activa boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: TABLE marca; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.marca IS 'Catálogo de marcas de vehículos';


--
-- Name: marca_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.marca_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: marca_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.marca_id_seq OWNED BY public.marca.id;


--
-- Name: marca_vehiculo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marca_vehiculo (
    id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE marca_vehiculo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.marca_vehiculo IS 'Marcas de veh??culos';


--
-- Name: marca_vehiculo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.marca_vehiculo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: marca_vehiculo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.marca_vehiculo_id_seq OWNED BY public.marca_vehiculo.id;


--
-- Name: motivo_no_atendido; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.motivo_no_atendido (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    requiere_observaciones boolean DEFAULT false NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE motivo_no_atendido; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.motivo_no_atendido IS 'Motivos por los que un incidente no fue atendido';


--
-- Name: motivo_no_atendido_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.motivo_no_atendido_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: motivo_no_atendido_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.motivo_no_atendido_id_seq OWNED BY public.motivo_no_atendido.id;


--
-- Name: movimiento_brigada; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.movimiento_brigada (
    id bigint NOT NULL,
    usuario_id integer NOT NULL,
    turno_id integer,
    origen_asignacion_id integer,
    origen_unidad_id integer,
    destino_asignacion_id integer,
    destino_unidad_id integer,
    tipo_movimiento character varying(30) NOT NULL,
    ruta_id integer,
    km numeric(6,2),
    latitud numeric(10,8),
    longitud numeric(11,8),
    hora_inicio timestamp with time zone DEFAULT now() NOT NULL,
    hora_fin timestamp with time zone,
    motivo text,
    rol_en_destino character varying(30),
    creado_por integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT movimiento_brigada_tipo_movimiento_check CHECK (((tipo_movimiento)::text = ANY (ARRAY[('CAMBIO_UNIDAD'::character varying)::text, ('PRESTAMO'::character varying)::text, ('DIVISION_FUERZA'::character varying)::text, ('RELEVO'::character varying)::text, ('RETIRO'::character varying)::text, ('APOYO_TEMPORAL'::character varying)::text])))
);


--
-- Name: TABLE movimiento_brigada; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.movimiento_brigada IS 'Historial de todos los movimientos de brigadas entre unidades.';


--
-- Name: COLUMN movimiento_brigada.tipo_movimiento; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.movimiento_brigada.tipo_movimiento IS 'Tipo de movimiento realizado';


--
-- Name: COLUMN movimiento_brigada.hora_fin; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.movimiento_brigada.hora_fin IS 'NULL si el movimiento a??n est?? activo';


--
-- Name: COLUMN movimiento_brigada.motivo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.movimiento_brigada.motivo IS 'Raz??n del movimiento';


--
-- Name: movimiento_brigada_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.movimiento_brigada_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: movimiento_brigada_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.movimiento_brigada_id_seq OWNED BY public.movimiento_brigada.id;


--
-- Name: municipio; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.municipio (
    id integer NOT NULL,
    departamento_id integer NOT NULL,
    codigo character varying(4) NOT NULL,
    nombre character varying(100) NOT NULL,
    nombre_completo character varying(150),
    cabecera_municipal character varying(100),
    poblacion integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE municipio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.municipio IS 'Municipios de Guatemala (340 total)';


--
-- Name: COLUMN municipio.codigo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.municipio.codigo IS 'C??digo oficial del municipio (formato DDMM)';


--
-- Name: COLUMN municipio.cabecera_municipal; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.municipio.cabecera_municipal IS 'Nombre de la cabecera municipal';


--
-- Name: municipio_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.municipio_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: municipio_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.municipio_id_seq OWNED BY public.municipio.id;


--
-- Name: piloto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.piloto (
    id integer NOT NULL,
    nombre character varying(255) NOT NULL,
    licencia_tipo character varying(1),
    licencia_numero bigint NOT NULL,
    licencia_vencimiento date,
    licencia_antiguedad integer,
    fecha_nacimiento date,
    etnia character varying(50),
    total_incidentes integer DEFAULT 0,
    total_sanciones integer DEFAULT 0,
    primer_incidente timestamp with time zone,
    ultimo_incidente timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    sexo character varying(20),
    CONSTRAINT piloto_licencia_tipo_check CHECK (((licencia_tipo)::text = ANY (ARRAY[('A'::character varying)::text, ('B'::character varying)::text, ('C'::character varying)::text, ('M'::character varying)::text, ('E'::character varying)::text])))
);


--
-- Name: TABLE piloto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.piloto IS 'Tabla maestra de pilotos. Un registro por licencia ??nica.';


--
-- Name: COLUMN piloto.licencia_tipo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.piloto.licencia_tipo IS 'Tipo de licencia: A=Moto, B=Liviano, C=Pesado, M=Maquinaria, E=Especial';


--
-- Name: COLUMN piloto.total_incidentes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.piloto.total_incidentes IS 'Contador de incidentes (actualizado por trigger)';


--
-- Name: COLUMN piloto.total_sanciones; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.piloto.total_sanciones IS 'Contador de sanciones (actualizado por trigger)';


--
-- Name: mv_pilotos_problematicos; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.mv_pilotos_problematicos AS
 SELECT id,
    nombre,
    licencia_tipo,
    licencia_numero,
    licencia_vencimiento,
    total_incidentes,
    total_sanciones,
    primer_incidente,
    ultimo_incidente,
        CASE
            WHEN (fecha_nacimiento IS NOT NULL) THEN EXTRACT(year FROM age((fecha_nacimiento)::timestamp with time zone))
            ELSE NULL::numeric
        END AS edad,
        CASE
            WHEN ((licencia_vencimiento IS NOT NULL) AND (licencia_vencimiento < now())) THEN true
            ELSE false
        END AS licencia_vencida,
        CASE
            WHEN (licencia_vencimiento IS NOT NULL) THEN (licencia_vencimiento - (now())::date)
            ELSE NULL::integer
        END AS dias_hasta_vencimiento,
        CASE
            WHEN ((total_sanciones >= 5) OR (total_incidentes >= 5)) THEN 5
            WHEN ((total_sanciones >= 3) OR (total_incidentes >= 4)) THEN 4
            WHEN ((total_sanciones >= 2) OR (total_incidentes >= 3)) THEN 3
            WHEN ((total_sanciones >= 1) OR (total_incidentes >= 2)) THEN 2
            ELSE 1
        END AS nivel_riesgo
   FROM public.piloto p
  WHERE ((total_incidentes >= 1) OR (total_sanciones >= 1))
  ORDER BY (total_incidentes + total_sanciones) DESC, ultimo_incidente DESC
  WITH NO DATA;


--
-- Name: MATERIALIZED VIEW mv_pilotos_problematicos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON MATERIALIZED VIEW public.mv_pilotos_problematicos IS 'Pilotos con incidentes/sanciones y su nivel de riesgo';


--
-- Name: tipo_vehiculo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tipo_vehiculo (
    id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    categoria character varying(30),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    codigo character varying(30),
    descripcion text,
    icono character varying(50),
    activo boolean DEFAULT true
);


--
-- Name: TABLE tipo_vehiculo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tipo_vehiculo IS 'Catálogo de tipos de vehículos';


--
-- Name: COLUMN tipo_vehiculo.categoria; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tipo_vehiculo.categoria IS 'LIVIANO, PESADO, MOTO';


--
-- Name: vehiculo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehiculo (
    id integer NOT NULL,
    placa character varying(20) NOT NULL,
    es_extranjero boolean DEFAULT false,
    tipo_vehiculo_id integer,
    color character varying(100),
    marca_id integer,
    cargado boolean DEFAULT false,
    tipo_carga character varying(100),
    total_incidentes integer DEFAULT 0,
    primer_incidente timestamp with time zone,
    ultimo_incidente timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    origen character varying(50) DEFAULT 'SITUACION'::character varying,
    empresa character varying(60)
);


--
-- Name: TABLE vehiculo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.vehiculo IS 'Tabla maestra de veh??culos. Un registro por placa ??nica.';


--
-- Name: COLUMN vehiculo.placa; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vehiculo.placa IS 'Placa del veh??culo (formato Guatemala: L###LLL)';


--
-- Name: COLUMN vehiculo.es_extranjero; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vehiculo.es_extranjero IS 'TRUE si es placa extranjera (sin validaci??n de formato)';


--
-- Name: COLUMN vehiculo.total_incidentes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vehiculo.total_incidentes IS 'Contador de incidentes (actualizado por trigger)';


--
-- Name: mv_vehiculos_reincidentes; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.mv_vehiculos_reincidentes AS
 SELECT v.id,
    v.placa,
    v.es_extranjero,
    tv.nombre AS tipo_vehiculo,
    m.nombre AS marca,
    v.color,
    v.total_incidentes,
    v.primer_incidente,
    v.ultimo_incidente,
        CASE
            WHEN (v.primer_incidente IS NOT NULL) THEN (EXTRACT(day FROM (now() - v.primer_incidente)))::integer
            ELSE NULL::integer
        END AS dias_desde_primer_incidente,
        CASE
            WHEN (v.ultimo_incidente IS NOT NULL) THEN (EXTRACT(day FROM (now() - v.ultimo_incidente)))::integer
            ELSE NULL::integer
        END AS dias_desde_ultimo_incidente,
        CASE
            WHEN ((v.primer_incidente IS NOT NULL) AND (v.ultimo_incidente IS NOT NULL)) THEN ((v.total_incidentes)::numeric / GREATEST((1)::numeric, (EXTRACT(epoch FROM (v.ultimo_incidente - v.primer_incidente)) / ((((30 * 24) * 60) * 60))::numeric)))
            ELSE (0)::numeric
        END AS frecuencia_mensual,
        CASE
            WHEN (v.total_incidentes >= 5) THEN 5
            WHEN (v.total_incidentes >= 4) THEN 4
            WHEN (v.total_incidentes >= 3) THEN 3
            WHEN (v.total_incidentes >= 2) THEN 2
            ELSE 1
        END AS nivel_riesgo
   FROM ((public.vehiculo v
     LEFT JOIN public.tipo_vehiculo tv ON ((v.tipo_vehiculo_id = tv.id)))
     LEFT JOIN public.marca_vehiculo m ON ((v.marca_id = m.id)))
  WHERE (v.total_incidentes >= 2)
  ORDER BY v.total_incidentes DESC, v.ultimo_incidente DESC
  WITH NO DATA;


--
-- Name: MATERIALIZED VIEW mv_vehiculos_reincidentes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON MATERIALIZED VIEW public.mv_vehiculos_reincidentes IS 'Veh??culos con m??ltiples incidentes y su nivel de riesgo';


--
-- Name: notificacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notificacion (
    id integer NOT NULL,
    usuario_id integer,
    tipo character varying(50) NOT NULL,
    titulo character varying(200) NOT NULL,
    mensaje text NOT NULL,
    datos jsonb DEFAULT '{}'::jsonb,
    enviada boolean DEFAULT false,
    fecha_envio timestamp with time zone,
    error_envio text,
    leida boolean DEFAULT false,
    fecha_lectura timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE notificacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.notificacion IS 'Historial de notificaciones enviadas a usuarios';


--
-- Name: notificacion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notificacion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notificacion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notificacion_id_seq OWNED BY public.notificacion.id;


--
-- Name: password_reset_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_log (
    id integer NOT NULL,
    usuario_id integer NOT NULL,
    habilitado_por integer,
    fecha_habilitacion timestamp without time zone NOT NULL,
    fecha_completado timestamp without time zone,
    ip_completado character varying(45),
    metodo character varying(20) DEFAULT 'APP'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE password_reset_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.password_reset_log IS 'Historial de restablecimientos de contraseña para auditoría';


--
-- Name: password_reset_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.password_reset_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: password_reset_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.password_reset_log_id_seq OWNED BY public.password_reset_log.id;


--
-- Name: permiso; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permiso (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    modulo character varying(50),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: permiso_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.permiso_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: permiso_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.permiso_id_seq OWNED BY public.permiso.id;


--
-- Name: persona_accidente; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.persona_accidente (
    id integer NOT NULL,
    hoja_accidentologia_id integer NOT NULL,
    vehiculo_accidente_id integer,
    tipo_persona character varying(20) NOT NULL,
    nombre_completo character varying(150),
    dpi character varying(20),
    edad integer,
    genero character varying(10),
    telefono character varying(20),
    direccion text,
    estado public.estado_persona_accidente NOT NULL,
    tipo_lesion public.tipo_lesion,
    descripcion_lesiones text,
    requirio_atencion boolean DEFAULT false,
    hospital_trasladado character varying(100),
    ambulancia_unidad character varying(50),
    hora_traslado time without time zone,
    hora_fallecimiento time without time zone,
    lugar_fallecimiento character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    situacion_id bigint NOT NULL,
    situacion_vehiculo_id bigint,
    datos_json jsonb
);


--
-- Name: TABLE persona_accidente; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.persona_accidente IS 'Personas afectadas en HECHO_TRANSITO (heridos/fallecidos). Vinculados directamente a situacion.';


--
-- Name: COLUMN persona_accidente.situacion_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.persona_accidente.situacion_id IS 'FK a situacion (tabla padre). Solo para tipo_situacion=HECHO_TRANSITO';


--
-- Name: persona_accidente_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.persona_accidente_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: persona_accidente_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.persona_accidente_id_seq OWNED BY public.persona_accidente.id;


--
-- Name: piloto_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.piloto_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: piloto_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.piloto_id_seq OWNED BY public.piloto.id;


--
-- Name: plantilla_comunicacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plantilla_comunicacion (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    tipo_situacion character varying(50),
    tipo_accidente public.tipo_accidente,
    contenido_plantilla text NOT NULL,
    activa boolean DEFAULT true,
    es_predefinida boolean DEFAULT false,
    hashtags text[],
    creado_por integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE plantilla_comunicacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.plantilla_comunicacion IS 'Plantillas/machotes para mensajes de redes sociales';


--
-- Name: plantilla_comunicacion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.plantilla_comunicacion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: plantilla_comunicacion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.plantilla_comunicacion_id_seq OWNED BY public.plantilla_comunicacion.id;


--
-- Name: plantilla_inspeccion_360; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plantilla_inspeccion_360 (
    id integer NOT NULL,
    tipo_unidad character varying(50) NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    version integer DEFAULT 1 NOT NULL,
    secciones jsonb NOT NULL,
    activa boolean DEFAULT true NOT NULL,
    creado_por integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE plantilla_inspeccion_360; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.plantilla_inspeccion_360 IS 'Plantillas dinámicas de inspección 360 por tipo de unidad. Los SUPER_ADMIN pueden crear/editar plantillas.';


--
-- Name: COLUMN plantilla_inspeccion_360.secciones; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plantilla_inspeccion_360.secciones IS 'Estructura JSON con secciones e items del formulario';


--
-- Name: plantilla_inspeccion_360_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.plantilla_inspeccion_360_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: plantilla_inspeccion_360_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.plantilla_inspeccion_360_id_seq OWNED BY public.plantilla_inspeccion_360.id;


--
-- Name: publicacion_social; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.publicacion_social (
    id integer NOT NULL,
    situacion_id integer,
    hoja_accidentologia_id integer,
    plantilla_id integer,
    contenido_texto text NOT NULL,
    contenido_editado text,
    hashtags text[],
    fotos_urls text[],
    publicado_facebook boolean DEFAULT false,
    publicado_twitter boolean DEFAULT false,
    publicado_instagram boolean DEFAULT false,
    publicado_whatsapp boolean DEFAULT false,
    publicado_threads boolean DEFAULT false,
    fecha_publicacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    publicado_por integer,
    estado character varying(20) DEFAULT 'BORRADOR'::character varying,
    fecha_programada timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE publicacion_social; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.publicacion_social IS 'Registro de publicaciones realizadas en redes sociales';


--
-- Name: publicacion_social_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.publicacion_social_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: publicacion_social_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.publicacion_social_id_seq OWNED BY public.publicacion_social.id;


--
-- Name: punto_mapa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.punto_mapa (
    id integer NOT NULL,
    capa_id integer NOT NULL,
    titulo character varying(200) NOT NULL,
    descripcion text,
    latitud numeric(10,7) NOT NULL,
    longitud numeric(10,7) NOT NULL,
    categoria character varying(100),
    icono_url text,
    datos jsonb,
    created_by integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    activo boolean DEFAULT true
);


--
-- Name: punto_mapa_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.punto_mapa_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: punto_mapa_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.punto_mapa_id_seq OWNED BY public.punto_mapa.id;


--
-- Name: reasignacion_sede; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reasignacion_sede (
    id integer NOT NULL,
    tipo character varying(20) NOT NULL,
    recurso_id integer NOT NULL,
    sede_origen_id integer NOT NULL,
    sede_destino_id integer NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_fin date,
    es_permanente boolean DEFAULT false NOT NULL,
    motivo text,
    estado character varying(20) DEFAULT 'ACTIVA'::character varying NOT NULL,
    autorizado_por integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reasignacion_sede_estado_check CHECK (((estado)::text = ANY (ARRAY[('ACTIVA'::character varying)::text, ('FINALIZADA'::character varying)::text, ('CANCELADA'::character varying)::text]))),
    CONSTRAINT reasignacion_sede_tipo_check CHECK (((tipo)::text = ANY (ARRAY[('USUARIO'::character varying)::text, ('UNIDAD'::character varying)::text])))
);


--
-- Name: TABLE reasignacion_sede; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.reasignacion_sede IS 'Reasignaciones temporales o permanentes de personal/unidades entre sedes';


--
-- Name: COLUMN reasignacion_sede.tipo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.reasignacion_sede.tipo IS 'USUARIO: brigadista | UNIDAD: veh??culo';


--
-- Name: COLUMN reasignacion_sede.recurso_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.reasignacion_sede.recurso_id IS 'ID del usuario o unidad reasignado';


--
-- Name: reasignacion_sede_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reasignacion_sede_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reasignacion_sede_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reasignacion_sede_id_seq OWNED BY public.reasignacion_sede.id;


--
-- Name: registro_cambio; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.registro_cambio (
    id bigint NOT NULL,
    tipo_cambio character varying(50) NOT NULL,
    usuario_afectado_id integer,
    asignacion_id integer,
    situacion_id bigint,
    unidad_id integer,
    valores_anteriores jsonb,
    valores_nuevos jsonb,
    motivo text NOT NULL,
    realizado_por integer NOT NULL,
    autorizado_por integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT registro_cambio_tipo_cambio_check CHECK (((tipo_cambio)::text = ANY (ARRAY[('CAMBIO_BRIGADA'::character varying)::text, ('CAMBIO_UNIDAD'::character varying)::text, ('REMOCION_ASIGNACION'::character varying)::text, ('SUSPENSION_ACCESO'::character varying)::text, ('REACTIVACION_ACCESO'::character varying)::text, ('CAMBIO_GRUPO'::character varying)::text, ('EDICION_SITUACION'::character varying)::text, ('EDICION_ASIGNACION'::character varying)::text, ('OTRO'::character varying)::text])))
);


--
-- Name: TABLE registro_cambio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.registro_cambio IS 'Registro de auditor??a de todos los cambios realizados en el sistema';


--
-- Name: COLUMN registro_cambio.valores_anteriores; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.registro_cambio.valores_anteriores IS 'Estado anterior en JSON';


--
-- Name: COLUMN registro_cambio.valores_nuevos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.registro_cambio.valores_nuevos IS 'Estado nuevo en JSON';


--
-- Name: COLUMN registro_cambio.motivo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.registro_cambio.motivo IS 'Motivo obligatorio para el cambio (ej: "Brigada enfermo", "Unidad con falla mec??nica")';


--
-- Name: registro_cambio_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.registro_cambio_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: registro_cambio_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.registro_cambio_id_seq OWNED BY public.registro_cambio.id;


--
-- Name: relevo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.relevo (
    id integer NOT NULL,
    situacion_id integer,
    tipo_relevo character varying(30) NOT NULL,
    unidad_saliente_id integer NOT NULL,
    unidad_entrante_id integer NOT NULL,
    brigadistas_salientes jsonb,
    brigadistas_entrantes jsonb,
    fecha_hora timestamp with time zone DEFAULT now() NOT NULL,
    observaciones text,
    registrado_por integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT relevo_tipo_relevo_check CHECK (((tipo_relevo)::text = ANY (ARRAY[('UNIDAD_COMPLETA'::character varying)::text, ('CRUZADO'::character varying)::text])))
);


--
-- Name: TABLE relevo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.relevo IS 'Registro de relevos entre unidades/tripulaciones';


--
-- Name: COLUMN relevo.tipo_relevo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.relevo.tipo_relevo IS 'UNIDAD_COMPLETA: 016 se va, 015 llega | CRUZADO: tripulaci??n 016 se queda con unidad 015';


--
-- Name: relevo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.relevo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: relevo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.relevo_id_seq OWNED BY public.relevo.id;


--
-- Name: reporte_horario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reporte_horario (
    id bigint NOT NULL,
    asignacion_id integer NOT NULL,
    km_actual numeric(6,2) NOT NULL,
    sentido_actual character varying(30),
    latitud numeric(10,8),
    longitud numeric(11,8),
    novedad text,
    reportado_por integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reporte_horario_sentido_actual_check CHECK (((sentido_actual)::text = ANY (ARRAY[('NORTE'::character varying)::text, ('SUR'::character varying)::text, ('ESTE'::character varying)::text, ('OESTE'::character varying)::text, ('ASCENDENTE'::character varying)::text, ('DESCENDENTE'::character varying)::text])))
);


--
-- Name: TABLE reporte_horario; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.reporte_horario IS 'Reportes horarios de posici??n de unidades (para COP y secuencia de radio)';


--
-- Name: reporte_horario_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reporte_horario_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reporte_horario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reporte_horario_id_seq OWNED BY public.reporte_horario.id;


--
-- Name: rol; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rol (
    id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion text,
    permisos jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE rol; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.rol IS 'Roles del sistema con permisos';


--
-- Name: COLUMN rol.permisos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rol.permisos IS 'JSON con permisos espec??ficos del rol';


--
-- Name: rol_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rol_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rol_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rol_id_seq OWNED BY public.rol.id;


--
-- Name: rol_permiso; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rol_permiso (
    rol_id integer NOT NULL,
    permiso_id integer NOT NULL
);


--
-- Name: ruta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ruta (
    id integer NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(150) NOT NULL,
    tipo_ruta character varying(30),
    km_inicial numeric(6,2),
    km_final numeric(6,2),
    activa boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE ruta; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ruta IS 'Cat??logo de rutas/carreteras';


--
-- Name: COLUMN ruta.tipo_ruta; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ruta.tipo_ruta IS 'CARRETERA, AUTOPISTA, BOULEVARD';


--
-- Name: ruta_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ruta_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ruta_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ruta_id_seq OWNED BY public.ruta.id;


--
-- Name: salida_unidad; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.salida_unidad (
    id integer NOT NULL,
    unidad_id integer NOT NULL,
    fecha_hora_salida timestamp with time zone DEFAULT now() NOT NULL,
    fecha_hora_regreso timestamp with time zone,
    estado character varying(30) DEFAULT 'EN_SALIDA'::character varying NOT NULL,
    ruta_inicial_id integer,
    km_inicial numeric(10,2),
    combustible_inicial numeric(5,2),
    km_final integer,
    combustible_final numeric(5,2),
    km_recorridos numeric(10,2),
    tripulacion jsonb,
    finalizada_por integer,
    observaciones_salida text,
    observaciones_regreso text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    sede_origen_id integer,
    inspeccion_360_id integer,
    CONSTRAINT salida_unidad_estado_check CHECK (((estado)::text = ANY (ARRAY[('EN_SALIDA'::character varying)::text, ('FINALIZADA'::character varying)::text, ('CANCELADA'::character varying)::text])))
);


--
-- Name: TABLE salida_unidad; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.salida_unidad IS 'Registro de salidas de unidades. Puede durar horas o d??as sin l??mite.';


--
-- Name: COLUMN salida_unidad.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.salida_unidad.estado IS 'EN_SALIDA: activa | FINALIZADA: regres?? a sede | CANCELADA: cancelada';


--
-- Name: COLUMN salida_unidad.km_inicial; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.salida_unidad.km_inicial IS 'Odómetro al iniciar salida (km, sin decimales)';


--
-- Name: COLUMN salida_unidad.km_final; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.salida_unidad.km_final IS 'Odómetro al finalizar salida (km, sin decimales)';


--
-- Name: COLUMN salida_unidad.tripulacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.salida_unidad.tripulacion IS 'Brigadistas que salieron en esta salida (snapshot al momento de salir)';


--
-- Name: COLUMN salida_unidad.finalizada_por; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.salida_unidad.finalizada_por IS 'Usuario que marc?? el regreso (puede ser brigadista, COP, Ops, Admin)';


--
-- Name: COLUMN salida_unidad.sede_origen_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.salida_unidad.sede_origen_id IS 'Sede desde donde sali?? la unidad';


--
-- Name: COLUMN salida_unidad.inspeccion_360_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.salida_unidad.inspeccion_360_id IS 'Inspección 360 aprobada para esta salida';


--
-- Name: salida_unidad_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.salida_unidad_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: salida_unidad_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.salida_unidad_id_seq OWNED BY public.salida_unidad.id;


--
-- Name: sancion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sancion (
    id integer NOT NULL,
    vehiculo_id integer NOT NULL,
    piloto_id integer,
    articulo_sancion_id integer,
    descripcion text,
    monto numeric(10,2),
    pagada boolean DEFAULT false,
    fecha_pago date,
    aplicada_por integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE sancion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.sancion IS 'Sanciones aplicadas en incidentes a veh??culos/pilotos';


--
-- Name: sancion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sancion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sancion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sancion_id_seq OWNED BY public.sancion.id;


--
-- Name: sede; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sede (
    id integer NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    departamento character varying(50),
    municipio character varying(50),
    direccion text,
    telefono character varying(20),
    activa boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    departamento_id integer,
    municipio_id integer,
    es_sede_central boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    codigo_boleta character varying(10)
);


--
-- Name: TABLE sede; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.sede IS 'Sedes de PROVIAL distribuidas por el pa??s';


--
-- Name: COLUMN sede.departamento; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sede.departamento IS 'DEPRECATED: Usar departamento_id + JOIN. Se sincroniza automÃ¡ticamente.';


--
-- Name: COLUMN sede.municipio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sede.municipio IS 'DEPRECATED: Usar municipio_id + JOIN. Se sincroniza automÃ¡ticamente.';


--
-- Name: COLUMN sede.activa; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sede.activa IS 'FALSE si la sede fue cerrada o est?? inactiva';


--
-- Name: COLUMN sede.departamento_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sede.departamento_id IS 'Departamento donde se ubica la sede';


--
-- Name: COLUMN sede.municipio_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sede.municipio_id IS 'Municipio donde se ubica la sede';


--
-- Name: COLUMN sede.codigo_boleta; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sede.codigo_boleta IS 'Código abreviado para numeración de boletas de accidentología';


--
-- Name: sede_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sede_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sede_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sede_id_seq OWNED BY public.sede.id;


--
-- Name: seq_situacion_persistente; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.seq_situacion_persistente
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: seq_situacion_persistente_anual; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.seq_situacion_persistente_anual
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: situacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.situacion (
    id bigint NOT NULL,
    tipo_situacion character varying(50) NOT NULL,
    estado character varying(20) DEFAULT 'ACTIVA'::character varying,
    asignacion_id integer,
    unidad_id integer NOT NULL,
    turno_id integer,
    ruta_id integer,
    km numeric(6,2),
    sentido character varying(30),
    latitud numeric(10,8),
    longitud numeric(11,8),
    observaciones text,
    creado_por integer NOT NULL,
    actualizado_por integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    departamento_id integer,
    municipio_id integer,
    salida_unidad_id integer,
    obstruccion_data jsonb,
    tipo_situacion_id integer,
    clima character varying(50),
    carga_vehicular character varying(50),
    codigo_situacion text NOT NULL,
    origen character varying(30) DEFAULT 'BRIGADA'::character varying,
    fecha_hora_aviso timestamp with time zone,
    fecha_hora_llegada timestamp with time zone,
    fecha_hora_finalizacion timestamp with time zone,
    tipo_pavimento character varying(50),
    iluminacion character varying(50),
    senalizacion character varying(50),
    visibilidad character varying(50),
    area character varying(10),
    causa_probable text,
    causa_especificar text,
    reportado_por_nombre character varying(150),
    reportado_por_telefono character varying(20),
    danios_materiales boolean DEFAULT false,
    danios_infraestructura boolean DEFAULT false,
    danios_descripcion text,
    numero_boleta character varying(20),
    numero_boleta_secuencia integer,
    referencia_ubicacion text,
    direccion_detallada text,
    jurisdiccion character varying(255),
    foto_url text,
    fotos_urls text[],
    croquis_url text,
    heridos integer DEFAULT 0,
    fallecidos integer DEFAULT 0,
    persistente boolean DEFAULT false,
    grupo smallint,
    acuerdo_involucrados boolean,
    acuerdo_detalle text,
    ilesos integer DEFAULT 0,
    heridos_leves integer DEFAULT 0,
    heridos_graves integer DEFAULT 0,
    trasladados integer DEFAULT 0,
    fugados integer DEFAULT 0,
    via_estado character varying(30),
    via_topografia character varying(30),
    via_geometria character varying(30),
    via_peralte character varying(30),
    via_condicion character varying(30),
    codigo_boleta character varying(50),
    origen_datos character varying(20) DEFAULT 'APP'::character varying,
    CONSTRAINT situacion_area_check CHECK (((area IS NULL) OR ((area)::text = ANY ((ARRAY['URBANA'::character varying, 'RURAL'::character varying])::text[])))),
    CONSTRAINT situacion_carga_vehicular_check CHECK (((carga_vehicular IS NULL) OR ((carga_vehicular)::text = ANY ((ARRAY['FLUIDO'::character varying, 'MODERADO'::character varying, 'DENSO'::character varying, 'CONGESTIONADO'::character varying])::text[])))),
    CONSTRAINT situacion_clima_check CHECK (((clima IS NULL) OR ((clima)::text = ANY ((ARRAY['DESPEJADO'::character varying, 'NUBLADO'::character varying, 'LLUVIA'::character varying, 'NEBLINA'::character varying, 'TORMENTA'::character varying])::text[])))),
    CONSTRAINT situacion_estado_check CHECK (((estado)::text = ANY (ARRAY[('ACTIVA'::character varying)::text, ('CERRADA'::character varying)::text, ('CANCELADA'::character varying)::text]))),
    CONSTRAINT situacion_origen_check CHECK (((origen)::text = ANY ((ARRAY['BRIGADA'::character varying, 'USUARIO_PUBLICO'::character varying, 'CENTRO_CONTROL'::character varying])::text[]))),
    CONSTRAINT situacion_sentido_check CHECK (((sentido)::text = ANY ((ARRAY['NORTE'::character varying, 'SUR'::character varying, 'ORIENTE'::character varying, 'OCCIDENTE'::character varying, 'AMBOS'::character varying])::text[]))),
    CONSTRAINT situacion_tipo_situacion_check CHECK (((tipo_situacion)::text = ANY ((ARRAY['SALIDA_SEDE'::character varying, 'PATRULLAJE'::character varying, 'CAMBIO_RUTA'::character varying, 'PARADA_ESTRATEGICA'::character varying, 'COMIDA'::character varying, 'DESCANSO'::character varying, 'INCIDENTE'::character varying, 'EMERGENCIA'::character varying, 'REGULACION_TRAFICO'::character varying, 'ASISTENCIA_VEHICULAR'::character varying, 'OTROS'::character varying])::text[])))
);


--
-- Name: TABLE situacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.situacion IS 'Situaciones operativas de unidades (salidas, patrullajes, incidentes, etc.)';


--
-- Name: COLUMN situacion.tipo_situacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.situacion.tipo_situacion IS 'Tipo de situaci??n operativa reportada';


--
-- Name: COLUMN situacion.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.situacion.estado IS 'ACTIVA: en curso | CERRADA: finalizada | CANCELADA: cancelada';


--
-- Name: COLUMN situacion.departamento_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.situacion.departamento_id IS 'Departamento de la situaci??n';


--
-- Name: COLUMN situacion.municipio_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.situacion.municipio_id IS 'Municipio de la situaci??n';


--
-- Name: COLUMN situacion.salida_unidad_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.situacion.salida_unidad_id IS 'Salida durante la cual se registr?? esta situaci??n';


--
-- Name: COLUMN situacion.obstruccion_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.situacion.obstruccion_data IS 'Datos de obstrucci??n en formato JSON v2';


--
-- Name: COLUMN situacion.clima; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.situacion.clima IS 'Condiciones clim ticas al momento de la situaci¢n';


--
-- Name: COLUMN situacion.carga_vehicular; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.situacion.carga_vehicular IS 'Nivel de carga vehicular en la v¡a';


--
-- Name: COLUMN situacion.codigo_situacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.situacion.codigo_situacion IS 'ID determinista: YYYYMMDD-SEDE-UNIDAD-TIPO-RUTA-KM-NUM (para offline-first)';


--
-- Name: COLUMN situacion.origen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.situacion.origen IS 'Origen del reporte: BRIGADA, USUARIO_PUBLICO, CENTRO_CONTROL';


--
-- Name: COLUMN situacion.fecha_hora_aviso; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.situacion.fecha_hora_aviso IS 'Momento en que se recibi¢ el aviso/reporte';


--
-- Name: COLUMN situacion.fecha_hora_llegada; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.situacion.fecha_hora_llegada IS 'Momento en que la unidad lleg¢ al lugar';


--
-- Name: situacion_actual; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.situacion_actual (
    unidad_id integer NOT NULL,
    situacion_id bigint,
    tipo_situacion character varying(50),
    estado character varying(20),
    latitud numeric(10,7),
    longitud numeric(10,7),
    km numeric(6,2),
    sentido character varying(20),
    ruta_id integer,
    ruta_codigo character varying(20),
    situacion_created_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now(),
    actividad_id bigint,
    actividad_tipo_nombre character varying(100),
    actividad_estado character varying(20),
    actividad_created_at timestamp with time zone,
    icono text
);


--
-- Name: TABLE situacion_actual; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.situacion_actual IS 'Cache de £ltima situaci¢n por unidad. Se actualiza autom ticamente con trigger.';


--
-- Name: situacion_causa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.situacion_causa (
    id integer NOT NULL,
    situacion_id bigint NOT NULL,
    causa_id integer NOT NULL
);


--
-- Name: situacion_causa_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.situacion_causa_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: situacion_causa_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.situacion_causa_id_seq OWNED BY public.situacion_causa.id;


--
-- Name: situacion_conflicto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.situacion_conflicto (
    id integer NOT NULL,
    codigo_situacion text NOT NULL,
    situacion_existente_id bigint,
    datos_locales jsonb NOT NULL,
    datos_servidor jsonb,
    diferencias jsonb DEFAULT '[]'::jsonb NOT NULL,
    usuario_reporta integer NOT NULL,
    tipo_conflicto text NOT NULL,
    estado text DEFAULT 'PENDIENTE'::text NOT NULL,
    resuelto_por integer,
    decision_cop text,
    notas_resolucion text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    CONSTRAINT conflicto_resolucion_completa CHECK (((estado <> 'RESUELTO'::text) OR ((resuelto_por IS NOT NULL) AND (decision_cop IS NOT NULL)))),
    CONSTRAINT situacion_conflicto_decision_cop_check CHECK (((decision_cop IS NULL) OR (decision_cop = ANY (ARRAY['USAR_LOCAL'::text, 'USAR_SERVIDOR'::text, 'DESCARTADO'::text])))),
    CONSTRAINT situacion_conflicto_estado_check CHECK ((estado = ANY (ARRAY['PENDIENTE'::text, 'RESUELTO'::text, 'DESCARTADO'::text]))),
    CONSTRAINT situacion_conflicto_tipo_conflicto_check CHECK ((tipo_conflicto = ANY (ARRAY['DUPLICADO'::text, 'NUMERO_USADO'::text, 'EDICION_SIMULTANEA'::text])))
);


--
-- Name: TABLE situacion_conflicto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.situacion_conflicto IS 'Conflictos de situaciones para revision del COP (sistema offline-first)';


--
-- Name: COLUMN situacion_conflicto.codigo_situacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.situacion_conflicto.codigo_situacion IS 'ID determinista de la situacion: YYYYMMDD-SEDE-UNIDAD-TIPO-RUTA-KM-NUM';


--
-- Name: COLUMN situacion_conflicto.datos_locales; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.situacion_conflicto.datos_locales IS 'JSON completo de los datos que el brigada intento guardar';


--
-- Name: COLUMN situacion_conflicto.datos_servidor; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.situacion_conflicto.datos_servidor IS 'JSON completo de los datos actuales en servidor (si existe)';


--
-- Name: COLUMN situacion_conflicto.diferencias; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.situacion_conflicto.diferencias IS 'Array de diferencias: [{campo, local, servidor}]';


--
-- Name: COLUMN situacion_conflicto.tipo_conflicto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.situacion_conflicto.tipo_conflicto IS 'DUPLICADO=mismo ID datos diferentes, NUMERO_USADO=numero ocupado, EDICION_SIMULTANEA=campo editado simultaneamente';


--
-- Name: COLUMN situacion_conflicto.decision_cop; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.situacion_conflicto.decision_cop IS 'USAR_LOCAL=sobreescribir servidor, USAR_SERVIDOR=descartar local, DESCARTADO=ignorar';


--
-- Name: situacion_conflicto_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.situacion_conflicto_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: situacion_conflicto_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.situacion_conflicto_id_seq OWNED BY public.situacion_conflicto.id;


--
-- Name: situacion_draft; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.situacion_draft (
    draft_uuid uuid NOT NULL,
    tipo_situacion character varying(50) NOT NULL,
    payload_json jsonb NOT NULL,
    estado_sync character varying(20) DEFAULT 'LOCAL'::character varying NOT NULL,
    usuario_id integer NOT NULL,
    situacion_id bigint,
    error_message text,
    sync_attempts integer DEFAULT 0,
    last_sync_attempt timestamp with time zone,
    synced_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT situacion_draft_estado_check CHECK (((estado_sync)::text = ANY ((ARRAY['LOCAL'::character varying, 'EN_PROCESO'::character varying, 'SINCRONIZADO'::character varying, 'ERROR'::character varying])::text[]))),
    CONSTRAINT situacion_draft_tipo_check CHECK (((tipo_situacion)::text = ANY ((ARRAY['PATRULLAJE'::character varying, 'HECHO_TRANSITO'::character varying, 'INCIDENTE'::character varying, 'ASISTENCIA_VEHICULAR'::character varying, 'EMERGENCIA'::character varying, 'REGULACION_TRAFICO'::character varying, 'PARADA_ESTRATEGICA'::character varying, 'CAMBIO_RUTA'::character varying, 'COMIDA'::character varying, 'DESCANSO'::character varying, 'OTROS'::character varying])::text[])))
);


--
-- Name: TABLE situacion_draft; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.situacion_draft IS 'Borradores de situaciones para arquitectura offline-first';


--
-- Name: COLUMN situacion_draft.tipo_situacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.situacion_draft.tipo_situacion IS 'Tipo de situacion: HECHO_TRANSITO, ASISTENCIA_VEHICULAR, EMERGENCIA, etc.';


--
-- Name: COLUMN situacion_draft.payload_json; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.situacion_draft.payload_json IS 'JSON completo del formulario capturado en el movil';


--
-- Name: COLUMN situacion_draft.estado_sync; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.situacion_draft.estado_sync IS 'Estado de sincronizacion: LOCAL, EN_PROCESO, SINCRONIZADO, ERROR';


--
-- Name: situacion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.situacion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: situacion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.situacion_id_seq OWNED BY public.situacion.id;


--
-- Name: situacion_multimedia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.situacion_multimedia (
    id integer NOT NULL,
    situacion_id integer,
    tipo character varying(10) NOT NULL,
    orden integer,
    url_original character varying(500) NOT NULL,
    url_thumbnail character varying(500),
    nombre_archivo character varying(255) NOT NULL,
    mime_type character varying(50) NOT NULL,
    tamanio_bytes integer NOT NULL,
    ancho integer,
    alto integer,
    duracion_segundos integer,
    latitud numeric(10,8),
    longitud numeric(11,8),
    subido_por integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    draft_uuid uuid,
    cloudinary_public_id character varying(255),
    estado character varying(20) DEFAULT 'PENDIENTE'::character varying,
    upload_attempts integer DEFAULT 0,
    last_error text,
    uploaded_at timestamp without time zone,
    infografia_numero integer DEFAULT 1 NOT NULL,
    infografia_titulo character varying(100),
    CONSTRAINT chk_infografia_numero_positive CHECK ((infografia_numero > 0)),
    CONSTRAINT chk_multimedia_ref CHECK (((draft_uuid IS NOT NULL) OR (situacion_id IS NOT NULL))),
    CONSTRAINT situacion_multimedia_orden_check CHECK (((orden >= 1) AND (orden <= 3))),
    CONSTRAINT situacion_multimedia_tipo_check CHECK (((tipo)::text = ANY (ARRAY[('FOTO'::character varying)::text, ('VIDEO'::character varying)::text])))
);


--
-- Name: TABLE situacion_multimedia; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.situacion_multimedia IS 'Almacena referencias a fotos y videos de situaciones';


--
-- Name: COLUMN situacion_multimedia.orden; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.situacion_multimedia.orden IS 'Orden de la foto (1-3), NULL para videos';


--
-- Name: COLUMN situacion_multimedia.url_original; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.situacion_multimedia.url_original IS 'URL del archivo comprimido pero en calidad completa';


--
-- Name: COLUMN situacion_multimedia.url_thumbnail; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.situacion_multimedia.url_thumbnail IS 'URL del thumbnail (200x200) para previews rápidos';


--
-- Name: COLUMN situacion_multimedia.draft_uuid; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.situacion_multimedia.draft_uuid IS 'UUID del draft al que pertenece (antes de sincronizar)';


--
-- Name: COLUMN situacion_multimedia.cloudinary_public_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.situacion_multimedia.cloudinary_public_id IS 'Public ID de Cloudinary (£nico, evita duplicados)';


--
-- Name: COLUMN situacion_multimedia.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.situacion_multimedia.estado IS 'PENDIENTE | SUBIDA | REGISTRADA | ERROR';


--
-- Name: COLUMN situacion_multimedia.upload_attempts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.situacion_multimedia.upload_attempts IS 'N£mero de intentos de subida/registro';


--
-- Name: COLUMN situacion_multimedia.infografia_numero; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.situacion_multimedia.infografia_numero IS 'N£mero de infograf¡a (1, 2, 3...) para agrupar fotos/videos';


--
-- Name: COLUMN situacion_multimedia.infografia_titulo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.situacion_multimedia.infografia_titulo IS 'T¡tulo descriptivo de la infog raf¡a (ej: "Llegada de gr£as", "Limpieza final")';


--
-- Name: situacion_multimedia_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.situacion_multimedia_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: situacion_multimedia_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.situacion_multimedia_id_seq OWNED BY public.situacion_multimedia.id;


--
-- Name: situacion_sesion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.situacion_sesion (
    id integer NOT NULL,
    situacion_id integer NOT NULL,
    unidad_id integer NOT NULL,
    usuario_id integer NOT NULL,
    reporte jsonb DEFAULT '{"entradas": []}'::jsonb,
    inicio timestamp with time zone DEFAULT now(),
    fin timestamp with time zone,
    activa boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: situacion_sesion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.situacion_sesion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: situacion_sesion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.situacion_sesion_id_seq OWNED BY public.situacion_sesion.id;


--
-- Name: situacion_vehiculo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.situacion_vehiculo (
    id integer NOT NULL,
    situacion_id integer NOT NULL,
    vehiculo_id integer NOT NULL,
    piloto_id integer,
    estado_piloto character varying(50),
    numero_poliza character varying(100),
    personas_asistidas integer DEFAULT 0,
    heridos_en_vehiculo integer DEFAULT 0,
    fallecidos_en_vehiculo integer DEFAULT 0,
    danos_estimados text,
    observaciones text,
    sancion boolean DEFAULT false,
    sancion_detalle jsonb,
    documentos_consignados jsonb,
    created_at timestamp with time zone DEFAULT now(),
    datos_piloto jsonb,
    custodia_estado character varying(20),
    custodia_datos jsonb,
    trasladados_en_vehiculo integer,
    edad_conductor integer
);


--
-- Name: situacion_vehiculo_dispositivo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.situacion_vehiculo_dispositivo (
    id integer NOT NULL,
    situacion_vehiculo_id bigint NOT NULL,
    dispositivo_seguridad_id integer NOT NULL,
    estado character varying(20) DEFAULT 'FUNCIONANDO'::character varying
);


--
-- Name: situacion_vehiculo_dispositivo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.situacion_vehiculo_dispositivo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: situacion_vehiculo_dispositivo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.situacion_vehiculo_dispositivo_id_seq OWNED BY public.situacion_vehiculo_dispositivo.id;


--
-- Name: situacion_vehiculo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.situacion_vehiculo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: situacion_vehiculo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.situacion_vehiculo_id_seq OWNED BY public.situacion_vehiculo.id;


--
-- Name: sub_rol_cop; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sub_rol_cop (
    id integer NOT NULL,
    codigo character varying(30) NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    puede_crear_persistentes boolean DEFAULT false NOT NULL,
    puede_cerrar_persistentes boolean DEFAULT false NOT NULL,
    puede_promover_situaciones boolean DEFAULT false NOT NULL,
    puede_asignar_unidades boolean DEFAULT true NOT NULL,
    solo_lectura boolean DEFAULT false NOT NULL,
    permisos jsonb DEFAULT '{}'::jsonb,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    puede_gestionar_usuarios boolean DEFAULT false,
    puede_gestionar_grupos boolean DEFAULT false,
    puede_ver_todos_departamentos boolean DEFAULT false
);


--
-- Name: TABLE sub_rol_cop; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.sub_rol_cop IS 'Sub-roles para usuarios COP: adminCOP, encargado_isla, sub_encargado_isla, operador';


--
-- Name: COLUMN sub_rol_cop.puede_crear_persistentes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sub_rol_cop.puede_crear_persistentes IS 'Puede crear situaciones persistentes extraordinarias';


--
-- Name: COLUMN sub_rol_cop.puede_promover_situaciones; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sub_rol_cop.puede_promover_situaciones IS 'Puede promover una situacion normal a persistente';


--
-- Name: COLUMN sub_rol_cop.solo_lectura; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sub_rol_cop.solo_lectura IS 'Solo puede visualizar, no puede realizar acciones';


--
-- Name: sub_rol_cop_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sub_rol_cop_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sub_rol_cop_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sub_rol_cop_id_seq OWNED BY public.sub_rol_cop.id;


--
-- Name: suscripcion_alerta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suscripcion_alerta (
    id integer NOT NULL,
    usuario_id integer NOT NULL,
    tipo_alerta public.tipo_alerta NOT NULL,
    activa boolean DEFAULT true,
    solo_sede_id integer,
    severidad_minima public.severidad_alerta DEFAULT 'BAJA'::public.severidad_alerta,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE suscripcion_alerta; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.suscripcion_alerta IS 'Suscripciones de usuarios a tipos de alerta';


--
-- Name: suscripcion_alerta_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.suscripcion_alerta_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: suscripcion_alerta_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.suscripcion_alerta_id_seq OWNED BY public.suscripcion_alerta.id;


--
-- Name: tarjeta_circulacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tarjeta_circulacion (
    id integer NOT NULL,
    vehiculo_id integer NOT NULL,
    numero bigint NOT NULL,
    nit bigint,
    direccion_propietario text,
    nombre_propietario character varying(255),
    modelo integer,
    fecha_registro timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE tarjeta_circulacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tarjeta_circulacion IS 'Datos de tarjetas de circulaci??n vinculadas a veh??culos';


--
-- Name: COLUMN tarjeta_circulacion.numero; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tarjeta_circulacion.numero IS 'N??mero de tarjeta de circulaci??n';


--
-- Name: COLUMN tarjeta_circulacion.nit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tarjeta_circulacion.nit IS 'NIT del propietario';


--
-- Name: tarjeta_circulacion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tarjeta_circulacion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tarjeta_circulacion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tarjeta_circulacion_id_seq OWNED BY public.tarjeta_circulacion.id;


--
-- Name: tipo_vehiculo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tipo_vehiculo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tipo_vehiculo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tipo_vehiculo_id_seq OWNED BY public.tipo_vehiculo.id;


--
-- Name: topografia_via; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.topografia_via (
    id integer NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(30) NOT NULL,
    orden integer DEFAULT 0 NOT NULL
);


--
-- Name: topografia_via_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.topografia_via_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: topografia_via_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.topografia_via_id_seq OWNED BY public.topografia_via.id;


--
-- Name: tripulacion_turno; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tripulacion_turno (
    id integer NOT NULL,
    asignacion_id integer NOT NULL,
    usuario_id integer NOT NULL,
    rol_tripulacion character varying(30) NOT NULL,
    presente boolean DEFAULT true,
    observaciones text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    telefono_contacto character varying(20),
    es_comandante boolean DEFAULT false NOT NULL,
    CONSTRAINT tripulacion_turno_rol_tripulacion_check CHECK (((rol_tripulacion)::text = ANY (ARRAY[('PILOTO'::character varying)::text, ('COPILOTO'::character varying)::text, ('ACOMPANANTE'::character varying)::text, ('ACOMPAÑANTE'::character varying)::text])))
);


--
-- Name: TABLE tripulacion_turno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tripulacion_turno IS 'Tripulaci??n asignada a cada unidad por turno';


--
-- Name: COLUMN tripulacion_turno.rol_tripulacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tripulacion_turno.rol_tripulacion IS 'Rol del brigadista en la unidad para este turno';


--
-- Name: COLUMN tripulacion_turno.presente; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tripulacion_turno.presente IS 'Si el brigadista se present?? al turno';


--
-- Name: COLUMN tripulacion_turno.telefono_contacto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tripulacion_turno.telefono_contacto IS 'Tel??fono de contacto para este turno espec??fico (puede diferir del usuario)';


--
-- Name: COLUMN tripulacion_turno.es_comandante; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tripulacion_turno.es_comandante IS 'TRUE = es el comandante responsable de la unidad en este turno';


--
-- Name: tripulacion_turno_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tripulacion_turno_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tripulacion_turno_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tripulacion_turno_id_seq OWNED BY public.tripulacion_turno.id;


--
-- Name: turno; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.turno (
    id integer NOT NULL,
    fecha date NOT NULL,
    estado character varying(30) DEFAULT 'PLANIFICADO'::character varying NOT NULL,
    observaciones text,
    creado_por integer NOT NULL,
    aprobado_por integer,
    fecha_aprobacion timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    fecha_fin date,
    publicado boolean DEFAULT false,
    fecha_publicacion timestamp with time zone,
    publicado_por integer,
    sede_id integer,
    CONSTRAINT turno_estado_check CHECK (((estado)::text = ANY (ARRAY[('PLANIFICADO'::character varying)::text, ('ACTIVO'::character varying)::text, ('CERRADO'::character varying)::text])))
);


--
-- Name: TABLE turno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.turno IS 'Turnos de trabajo por d??a (planificaci??n de Operaciones)';


--
-- Name: COLUMN turno.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.turno.estado IS 'PLANIFICADO: creado pero no iniciado | ACTIVO: en curso | CERRADO: finalizado';


--
-- Name: COLUMN turno.fecha_fin; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.turno.fecha_fin IS 'Fecha de fin del turno. Si es NULL, el turno es de un solo día (fecha)';


--
-- Name: COLUMN turno.publicado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.turno.publicado IS 'Si false, la asignación está en borrador y no es visible para brigadas';


--
-- Name: turno_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.turno_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: turno_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.turno_id_seq OWNED BY public.turno.id;


--
-- Name: ubicacion_brigada; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ubicacion_brigada (
    id integer NOT NULL,
    usuario_id integer NOT NULL,
    asignacion_origen_id integer NOT NULL,
    unidad_origen_id integer NOT NULL,
    unidad_actual_id integer,
    asignacion_actual_id integer,
    estado public.estado_ubicacion_brigada DEFAULT 'CON_UNIDAD'::public.estado_ubicacion_brigada NOT NULL,
    punto_fijo_km numeric(6,2),
    punto_fijo_sentido character varying(30),
    punto_fijo_ruta_id integer,
    punto_fijo_latitud numeric(10,8),
    punto_fijo_longitud numeric(11,8),
    punto_fijo_descripcion text,
    situacion_persistente_id integer,
    inicio_ubicacion timestamp with time zone DEFAULT now() NOT NULL,
    fin_ubicacion timestamp with time zone,
    creado_por integer,
    motivo text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE ubicacion_brigada; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ubicacion_brigada IS 'Rastrea la ubicación física actual de cada brigada. Permite préstamos, divisiones y cambios de unidad.';


--
-- Name: ubicacion_brigada_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ubicacion_brigada_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ubicacion_brigada_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ubicacion_brigada_id_seq OWNED BY public.ubicacion_brigada.id;


--
-- Name: unidad; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unidad (
    id integer NOT NULL,
    codigo character varying(20) NOT NULL,
    tipo_unidad character varying(50) NOT NULL,
    marca character varying(50),
    modelo character varying(50),
    anio integer,
    placa character varying(20),
    sede_id integer NOT NULL,
    activa boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    combustible_actual numeric(6,2) DEFAULT 0,
    capacidad_combustible numeric(6,2),
    odometro_actual numeric(10,2) DEFAULT 0,
    custom_fields jsonb DEFAULT '{}'::jsonb,
    tipo_combustible character varying(10) DEFAULT 'GASOLINA'::character varying,
    nivel_combustible character varying(10),
    disponible_transportes boolean DEFAULT false NOT NULL,
    instrucciones_transportes text,
    CONSTRAINT unidad_tipo_combustible_check CHECK (((tipo_combustible)::text = ANY ((ARRAY['GASOLINA'::character varying, 'DIESEL'::character varying])::text[])))
);


--
-- Name: TABLE unidad; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.unidad IS 'Veh??culos/unidades operativas';


--
-- Name: COLUMN unidad.tipo_unidad; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.unidad.tipo_unidad IS 'MOTORIZADA, PICKUP, PATRULLA, etc.';


--
-- Name: COLUMN unidad.sede_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.unidad.sede_id IS 'Sede base de la unidad';


--
-- Name: COLUMN unidad.combustible_actual; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.unidad.combustible_actual IS 'Combustible actual en litros (actualizado por brigadas)';


--
-- Name: COLUMN unidad.capacidad_combustible; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.unidad.capacidad_combustible IS 'Capacidad total del tanque en litros';


--
-- Name: COLUMN unidad.odometro_actual; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.unidad.odometro_actual IS 'Kilometraje total del veh??culo';


--
-- Name: unidad_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.unidad_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: unidad_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.unidad_id_seq OWNED BY public.unidad.id;


--
-- Name: unidad_reparacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unidad_reparacion (
    id integer NOT NULL,
    unidad_id integer NOT NULL,
    motivo character varying(200) NOT NULL,
    descripcion text,
    fecha_inicio date DEFAULT CURRENT_DATE NOT NULL,
    fecha_fin date,
    estado character varying(20) DEFAULT 'EN_REPARACION'::character varying NOT NULL,
    registrado_por integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT unidad_reparacion_estado_check CHECK (((estado)::text = ANY ((ARRAY['EN_REPARACION'::character varying, 'COMPLETADA'::character varying, 'CANCELADA'::character varying])::text[])))
);


--
-- Name: unidad_reparacion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.unidad_reparacion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: unidad_reparacion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.unidad_reparacion_id_seq OWNED BY public.unidad_reparacion.id;


--
-- Name: usuario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuario (
    id integer NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    username character varying(50) NOT NULL,
    password_hash character varying(255) NOT NULL,
    nombre_completo character varying(150) NOT NULL,
    email character varying(100),
    telefono character varying(20),
    rol_id integer NOT NULL,
    sede_id integer,
    activo boolean DEFAULT true NOT NULL,
    ultimo_acceso timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    grupo smallint,
    fecha_inicio_ciclo date,
    acceso_app_activo boolean DEFAULT true,
    exento_grupos boolean DEFAULT false,
    chapa character varying(20),
    rol_brigada character varying(20),
    puede_ver_todas_sedes boolean DEFAULT false,
    genero character varying(20),
    sub_rol_cop_id integer,
    es_encargado_grupo boolean DEFAULT false,
    password_reset_required boolean DEFAULT false,
    password_last_reset timestamp without time zone,
    password_reset_by integer,
    password_reset_enabled_at timestamp without time zone,
    custom_fields jsonb DEFAULT '{}'::jsonb,
    reset_password_enabled boolean DEFAULT false NOT NULL,
    CONSTRAINT usuario_grupo_check CHECK (((grupo IS NULL) OR (grupo = ANY (ARRAY[0, 1, 2])))),
    CONSTRAINT usuario_rol_brigada_check CHECK (((rol_brigada)::text = ANY (ARRAY[('PILOTO'::character varying)::text, ('COPILOTO'::character varying)::text, ('ACOMPA??ANTE'::character varying)::text])))
);


--
-- Name: TABLE usuario; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.usuario IS 'Usuarios del sistema';


--
-- Name: COLUMN usuario.password_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.password_hash IS 'Hash bcrypt de la contrase??a';


--
-- Name: COLUMN usuario.sede_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.sede_id IS 'Sede a la que pertenece el usuario. NULL = acceso a todas (COP)';


--
-- Name: COLUMN usuario.grupo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.grupo IS 'Grupo de trabajo: 1 o 2 (8 d??as trabajo, 8 d??as descanso)';


--
-- Name: COLUMN usuario.fecha_inicio_ciclo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.fecha_inicio_ciclo IS 'Fecha de inicio del ciclo actual (para calcular turnos)';


--
-- Name: COLUMN usuario.acceso_app_activo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.acceso_app_activo IS 'Si el usuario tiene acceso activo a la app (controlado por COP)';


--
-- Name: COLUMN usuario.exento_grupos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.exento_grupos IS 'True si el usuario est?? exento del sistema de grupos (admins, jefes)';


--
-- Name: COLUMN usuario.chapa; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.chapa IS 'NÃºmero de chapa/identificaciÃ³n del agente';


--
-- Name: COLUMN usuario.rol_brigada; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.rol_brigada IS 'Rol espec??fico del brigadista: PILOTO, COPILOTO, ACOMPA??ANTE';


--
-- Name: COLUMN usuario.puede_ver_todas_sedes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.puede_ver_todas_sedes IS 'Si true, el usuario puede ver asignaciones de todas las sedes (solo lectura)';


--
-- Name: COLUMN usuario.genero; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.genero IS 'GÃ©nero del usuario (M/F)';


--
-- Name: COLUMN usuario.password_reset_required; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.password_reset_required IS 'Indica si el usuario debe cambiar su contraseña en el próximo login';


--
-- Name: COLUMN usuario.password_last_reset; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.password_last_reset IS 'Fecha del último cambio de contraseña';


--
-- Name: COLUMN usuario.password_reset_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.password_reset_by IS 'ID del admin que habilitó el reset';


--
-- Name: COLUMN usuario.password_reset_enabled_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.password_reset_enabled_at IS 'Fecha en que se habilitó el reset';


--
-- Name: usuario_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usuario_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usuario_id_seq OWNED BY public.usuario.id;


--
-- Name: usuario_inactividad; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuario_inactividad (
    id integer NOT NULL,
    usuario_id integer NOT NULL,
    motivo_id integer NOT NULL,
    fecha_inicio date DEFAULT CURRENT_DATE NOT NULL,
    fecha_fin_estimada date,
    fecha_fin_real date,
    observaciones text,
    registrado_por integer,
    reactivado_por integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE usuario_inactividad; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.usuario_inactividad IS 'Historial de periodos de inactividad de usuarios con motivos';


--
-- Name: usuario_inactividad_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usuario_inactividad_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuario_inactividad_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usuario_inactividad_id_seq OWNED BY public.usuario_inactividad.id;


--
-- Name: usuario_rol; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuario_rol (
    id integer NOT NULL,
    usuario_id integer NOT NULL,
    rol_id integer NOT NULL,
    sede_id integer,
    es_rol_principal boolean DEFAULT false,
    activo boolean DEFAULT true,
    asignado_por integer,
    fecha_asignacion timestamp with time zone DEFAULT now(),
    fecha_revocacion timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE usuario_rol; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.usuario_rol IS 'Asignación de múltiples roles a usuarios, con soporte para roles por sede';


--
-- Name: usuario_rol_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usuario_rol_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuario_rol_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usuario_rol_id_seq OWNED BY public.usuario_rol.id;


--
-- Name: v_alertas_activas; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_alertas_activas AS
 SELECT a.id,
    a.tipo,
    a.severidad,
    a.estado,
    a.titulo,
    a.mensaje,
    a.datos,
    a.sede_id,
    a.unidad_id,
    a.brigada_id,
    a.situacion_id,
    a.atendida_por,
    a.fecha_atencion,
    a.nota_resolucion,
    a.fecha_expiracion,
    a.created_at,
    a.updated_at,
    s.nombre AS sede_nombre,
    u.codigo AS unidad_codigo,
    u.tipo_unidad,
    b.nombre AS brigada_nombre,
    b.codigo AS brigada_chapa,
    aten.nombre_completo AS atendida_por_nombre,
    (EXTRACT(epoch FROM (CURRENT_TIMESTAMP - (a.created_at)::timestamp with time zone)) / (60)::numeric) AS minutos_activa
   FROM ((((public.alerta a
     LEFT JOIN public.sede s ON ((a.sede_id = s.id)))
     LEFT JOIN public.unidad u ON ((a.unidad_id = u.id)))
     LEFT JOIN public.brigada b ON ((a.brigada_id = b.id)))
     LEFT JOIN public.usuario aten ON ((a.atendida_por = aten.id)))
  WHERE ((a.estado = 'ACTIVA'::public.estado_alerta) AND ((a.fecha_expiracion IS NULL) OR (a.fecha_expiracion > CURRENT_TIMESTAMP)))
  ORDER BY
        CASE a.severidad
            WHEN 'CRITICA'::public.severidad_alerta THEN 1
            WHEN 'ALTA'::public.severidad_alerta THEN 2
            WHEN 'MEDIA'::public.severidad_alerta THEN 3
            ELSE 4
        END, a.created_at DESC;


--
-- Name: v_asignaciones_completas; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_asignaciones_completas AS
 SELECT au.id,
    au.turno_id,
    t.fecha AS fecha_programada,
    au.unidad_id,
    u.codigo AS unidad_codigo,
    u.tipo_unidad,
    au.ruta_id,
    r.codigo AS ruta_codigo,
    r.nombre AS ruta_nombre,
    au.km_inicio,
    au.km_final,
    au.sentido,
    au.acciones,
    au.hora_salida,
    au.hora_entrada_estimada,
    au.es_reaccion,
        CASE
            WHEN (au.hora_entrada_real IS NOT NULL) THEN 'FINALIZADA'::text
            WHEN (au.hora_salida_real IS NOT NULL) THEN 'EN_CURSO'::text
            ELSE 'PROGRAMADA'::text
        END AS estado,
    au.hora_salida_real,
    au.hora_entrada_real,
    ( SELECT json_agg(json_build_object('usuario_id', tt.usuario_id, 'nombre', mu.nombre_completo, 'rol', tt.rol_tripulacion, 'presente', tt.presente)) AS json_agg
           FROM (public.tripulacion_turno tt
             JOIN public.usuario mu ON ((tt.usuario_id = mu.id)))
          WHERE (tt.asignacion_id = au.id)) AS tripulacion
   FROM (((public.asignacion_unidad au
     JOIN public.turno t ON ((au.turno_id = t.id)))
     JOIN public.unidad u ON ((au.unidad_id = u.id)))
     LEFT JOIN public.ruta r ON ((au.ruta_id = r.id)));


--
-- Name: v_asignaciones_pendientes; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_asignaciones_pendientes AS
 SELECT t.id AS turno_id,
    t.fecha,
    t.fecha_fin,
    t.estado AS turno_estado,
    t.sede_id,
    COALESCE(t.publicado, false) AS publicado,
    t.fecha_publicacion,
    a.id AS asignacion_id,
    a.id,
    u.id AS unidad_id,
    u.codigo AS unidad_codigo,
    u.tipo_unidad,
    r.id AS ruta_id,
    r.codigo AS ruta_codigo,
    r.nombre AS ruta_nombre,
    a.km_inicio,
    a.km_final,
    a.sentido,
    a.hora_salida,
    a.hora_entrada_estimada,
    a.hora_salida_real,
    a.acciones,
        CASE
            WHEN (t.fecha = CURRENT_DATE) THEN 'HOY'::text
            WHEN (t.fecha = (CURRENT_DATE + '1 day'::interval)) THEN 'MA¥ANA'::text
            WHEN (t.fecha < CURRENT_DATE) THEN (('PENDIENTE ('::text || t.fecha) || ')'::text)
            ELSE (t.fecha)::text
        END AS dia_salida,
    su.estado AS salida_estado,
        CASE
            WHEN ((su.estado)::text = 'EN_SALIDA'::text) THEN true
            ELSE false
        END AS en_ruta,
    su.fecha_hora_salida AS salida_hora_real,
    ( SELECT json_agg(json_build_object('usuario_id', usr.id, 'nombre_completo', usr.nombre_completo, 'nombre', usr.nombre_completo, 'chapa', usr.chapa, 'telefono', usr.telefono, 'rol_tripulacion', tc.rol_tripulacion, 'rol', tc.rol_tripulacion) ORDER BY
                CASE tc.rol_tripulacion
                    WHEN 'PILOTO'::text THEN 1
                    WHEN 'COPILOTO'::text THEN 2
                    WHEN 'ACOMPA¥ANTE'::text THEN 3
                    ELSE 4
                END) AS json_agg
           FROM (public.tripulacion_turno tc
             JOIN public.usuario usr ON ((tc.usuario_id = usr.id)))
          WHERE (tc.asignacion_id = a.id)) AS tripulacion
   FROM ((((public.turno t
     JOIN public.asignacion_unidad a ON ((t.id = a.turno_id)))
     JOIN public.unidad u ON ((a.unidad_id = u.id)))
     LEFT JOIN public.ruta r ON ((a.ruta_id = r.id)))
     LEFT JOIN public.salida_unidad su ON (((a.unidad_id = su.unidad_id) AND ((su.estado)::text = 'EN_SALIDA'::text) AND (date(su.fecha_hora_salida) = t.fecha))))
  WHERE ((t.estado)::text = ANY ((ARRAY['PLANIFICADO'::character varying, 'ACTIVO'::character varying])::text[]))
  ORDER BY t.fecha, a.hora_salida;


--
-- Name: v_asignaciones_por_sede; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_asignaciones_por_sede AS
 SELECT t.id AS turno_id,
    t.fecha,
    t.estado AS turno_estado,
    t.publicado,
    t.fecha_publicacion,
    t.sede_id,
    s.nombre AS sede_nombre,
    s.codigo AS sede_codigo,
    t.creado_por,
    uc.nombre_completo AS creado_por_nombre,
    cv.color_fondo,
    cv.color_fondo_header,
    cv.color_texto,
    cv.color_acento,
    cv.fuente,
    cv.tamano_fuente,
    cv.alerta_rotacion_rutas_activa,
    cv.umbral_rotacion_rutas,
    au.id AS asignacion_id,
    au.unidad_id,
    u.codigo AS unidad_codigo,
    u.tipo_unidad,
    u.placa AS unidad_placa,
    au.ruta_id,
    r.codigo AS ruta_codigo,
    r.nombre AS ruta_nombre,
    au.km_inicio,
    au.km_final,
    au.sentido,
    au.acciones,
    au.acciones_formato,
    au.hora_salida,
    au.estado_nomina,
        CASE
            WHEN ((su.estado)::text = 'EN_SALIDA'::text) THEN true
            ELSE false
        END AS en_ruta,
    su.estado AS salida_estado,
    au.created_at AS asignacion_created_at
   FROM (((((((public.turno t
     LEFT JOIN public.sede s ON ((t.sede_id = s.id)))
     LEFT JOIN public.usuario uc ON ((t.creado_por = uc.id)))
     LEFT JOIN public.configuracion_visual_sede cv ON ((t.sede_id = cv.sede_id)))
     LEFT JOIN public.asignacion_unidad au ON ((t.id = au.turno_id)))
     LEFT JOIN public.unidad u ON ((au.unidad_id = u.id)))
     LEFT JOIN public.ruta r ON ((au.ruta_id = r.id)))
     LEFT JOIN public.salida_unidad su ON (((au.unidad_id = su.unidad_id) AND ((su.estado)::text = 'EN_SALIDA'::text) AND (date(su.fecha_hora_salida) = t.fecha))))
  ORDER BY t.sede_id, au.hora_salida;


--
-- Name: v_bitacora_historica_detalle; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_bitacora_historica_detalle AS
 SELECT b.id,
    b.fecha,
    b.unidad_id,
    u.codigo AS unidad_codigo,
    u.tipo_unidad,
    u.placa AS unidad_placa,
    b.sede_origen_id,
    s.nombre AS sede_nombre,
    b.ruta_inicial_id,
    r.codigo AS ruta_codigo,
    r.nombre AS ruta_nombre,
    b.km_inicial,
    b.km_final,
    b.km_recorridos,
    b.combustible_inicial,
    b.combustible_final,
    b.hora_inicio,
    b.hora_fin,
    b.duracion_minutos,
    ( SELECT jsonb_agg(jsonb_build_object('usuario_id', ((t.value ->> 'usuario_id'::text))::integer, 'rol', (t.value ->> 'rol'::text), 'nombre', usr.nombre_completo, 'chapa', usr.chapa)) AS jsonb_agg
           FROM (jsonb_array_elements(b.tripulacion_ids) t(value)
             LEFT JOIN public.usuario usr ON ((((t.value ->> 'usuario_id'::text))::integer = usr.id)))) AS tripulacion_detalle,
    b.situaciones_resumen,
    b.total_situaciones,
    b.ingresos_resumen,
    b.total_ingresos,
    b.total_incidentes,
    b.total_asistencias,
    b.total_emergencias,
    b.total_regulaciones,
    b.total_patrullajes,
    b.observaciones_inicio,
    b.observaciones_fin,
    b.finalizado_por,
    fin.nombre_completo AS finalizado_por_nombre,
    b.created_at
   FROM ((((public.bitacora_historica b
     JOIN public.unidad u ON ((b.unidad_id = u.id)))
     LEFT JOIN public.sede s ON ((b.sede_origen_id = s.id)))
     LEFT JOIN public.ruta r ON ((b.ruta_inicial_id = r.id)))
     LEFT JOIN public.usuario fin ON ((b.finalizado_por = fin.id)));


--
-- Name: v_brigada; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_brigada AS
 SELECT b.id,
    b.usuario_id,
    COALESCE(u.nombre_completo, b.nombre) AS nombre,
    COALESCE(u.chapa, b.codigo) AS codigo,
    COALESCE(u.telefono, b.telefono) AS telefono,
    COALESCE(u.email, b.email) AS email,
    COALESCE(u.sede_id, b.sede_id) AS sede_id,
    COALESCE(u.activo, b.activa) AS activo,
    u.id AS usuario_id_real,
    u.username,
    u.rol_id,
    u.grupo,
    u.rol_brigada,
    u.genero,
    (b.usuario_id IS NOT NULL) AS tiene_usuario_vinculado,
        CASE
            WHEN ((b.usuario_id IS NOT NULL) AND (b.nombre IS NOT NULL) AND (u.nombre_completo IS NOT NULL) AND ((b.nombre)::text <> (u.nombre_completo)::text)) THEN true
            ELSE false
        END AS tiene_inconsistencia
   FROM (public.brigada b
     LEFT JOIN public.usuario u ON ((b.usuario_id = u.id)));


--
-- Name: VIEW v_brigada; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_brigada IS 'Vista de compatibilidad brigadaâ†’usuario. Usar esta en lugar de tabla brigada directa.';


--
-- Name: v_brigadas_activas_ahora; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_brigadas_activas_ahora AS
 SELECT DISTINCT u.id AS usuario_id,
    u.nombre_completo,
    u.grupo,
    m.turno_id,
    m.destino_asignacion_id AS asignacion_actual,
    m.destino_unidad_id AS unidad_actual,
    un.codigo AS unidad_codigo,
    m.tipo_movimiento,
    m.rol_en_destino,
    m.motivo,
    m.hora_inicio,
    (EXTRACT(epoch FROM (now() - m.hora_inicio)) / (3600)::numeric) AS horas_en_posicion
   FROM ((public.movimiento_brigada m
     JOIN public.usuario u ON ((m.usuario_id = u.id)))
     LEFT JOIN public.unidad un ON ((m.destino_unidad_id = un.id)))
  WHERE ((m.hora_fin IS NULL) AND (date(m.hora_inicio) = CURRENT_DATE))
  ORDER BY u.nombre_completo;


--
-- Name: VIEW v_brigadas_activas_ahora; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_brigadas_activas_ahora IS 'Brigadas actualmente en servicio con su ubicaci??n actual';


--
-- Name: v_brigadas_con_asignaciones_activas; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_brigadas_con_asignaciones_activas AS
 SELECT u.id AS usuario_id,
    u.nombre_completo,
    u.grupo,
    t.id AS turno_id,
    t.fecha AS turno_fecha,
    au.id AS asignacion_id,
    un.codigo AS unidad_codigo,
    tt.rol_tripulacion,
    tt.presente,
    au.dia_cerrado
   FROM ((((public.usuario u
     JOIN public.tripulacion_turno tt ON ((u.id = tt.usuario_id)))
     JOIN public.asignacion_unidad au ON ((tt.asignacion_id = au.id)))
     JOIN public.turno t ON ((au.turno_id = t.id)))
     JOIN public.unidad un ON ((au.unidad_id = un.id)))
  WHERE ((t.fecha = CURRENT_DATE) AND (au.dia_cerrado = false))
  ORDER BY un.codigo, tt.rol_tripulacion;


--
-- Name: VIEW v_brigadas_con_asignaciones_activas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_brigadas_con_asignaciones_activas IS 'Brigadas que tienen asignaciones activas hoy';


--
-- Name: v_composicion_unidades_ahora; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_composicion_unidades_ahora AS
 SELECT un.id AS unidad_id,
    un.codigo AS unidad_codigo,
    json_agg(json_build_object('usuario_id', u.id, 'nombre', u.nombre_completo, 'rol', m.rol_en_destino, 'tipo_movimiento', m.tipo_movimiento, 'desde', m.hora_inicio, 'motivo', m.motivo) ORDER BY
        CASE m.rol_en_destino
            WHEN 'PILOTO'::text THEN 1
            WHEN 'COPILOTO'::text THEN 2
            WHEN 'ACOMPA??ANTE'::text THEN 3
            ELSE 4
        END) AS tripulacion_actual,
    count(*) AS total_brigadas
   FROM ((public.movimiento_brigada m
     JOIN public.usuario u ON ((m.usuario_id = u.id)))
     JOIN public.unidad un ON ((m.destino_unidad_id = un.id)))
  WHERE ((m.hora_fin IS NULL) AND (date(m.hora_inicio) = CURRENT_DATE))
  GROUP BY un.id, un.codigo
  ORDER BY un.codigo;


--
-- Name: VIEW v_composicion_unidades_ahora; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_composicion_unidades_ahora IS 'Tripulaci??n actual de cada unidad en tiempo real';


--
-- Name: v_disponibilidad_recursos; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_disponibilidad_recursos AS
 SELECT s.id AS sede_id,
    s.nombre AS sede_nombre,
    count(DISTINCT u.id) FILTER (WHERE (((r.nombre)::text = 'BRIGADA'::text) AND (u.activo = true))) AS total_brigadas_activas,
    count(DISTINCT tt.usuario_id) FILTER (WHERE ((t.fecha = CURRENT_DATE) AND ((r.nombre)::text = 'BRIGADA'::text) AND (u.activo = true))) AS brigadas_en_turno_hoy,
    count(DISTINCT un.id) FILTER (WHERE (un.activa = true)) AS total_unidades_activas,
    count(DISTINCT au.unidad_id) FILTER (WHERE (t.fecha = CURRENT_DATE)) AS unidades_en_turno_hoy,
    count(DISTINCT u.id) FILTER (WHERE (((r.nombre)::text = 'BRIGADA'::text) AND (u.activo = true) AND (NOT (u.id IN ( SELECT tt2.usuario_id
           FROM ((public.tripulacion_turno tt2
             JOIN public.asignacion_unidad au2 ON ((tt2.asignacion_id = au2.id)))
             JOIN public.turno t2 ON ((au2.turno_id = t2.id)))
          WHERE (t2.fecha = CURRENT_DATE)))))) AS brigadas_disponibles_hoy,
    count(DISTINCT un.id) FILTER (WHERE ((un.activa = true) AND (NOT (un.id IN ( SELECT au3.unidad_id
           FROM (public.asignacion_unidad au3
             JOIN public.turno t3 ON ((au3.turno_id = t3.id)))
          WHERE (t3.fecha = CURRENT_DATE)))))) AS unidades_disponibles_hoy
   FROM ((((((public.sede s
     LEFT JOIN public.usuario u ON ((s.id = u.sede_id)))
     LEFT JOIN public.rol r ON ((u.rol_id = r.id)))
     LEFT JOIN public.unidad un ON ((s.id = un.sede_id)))
     LEFT JOIN public.tripulacion_turno tt ON ((u.id = tt.usuario_id)))
     LEFT JOIN public.asignacion_unidad au ON (((tt.asignacion_id = au.id) AND (un.id = au.unidad_id))))
     LEFT JOIN public.turno t ON ((au.turno_id = t.id)))
  GROUP BY s.id, s.nombre;


--
-- Name: v_encargados_actuales; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_encargados_actuales AS
 SELECT h.id AS asignacion_id,
    h.usuario_id,
    u.nombre_completo,
    u.chapa,
    u.telefono,
    u.email,
    h.sede_id,
    s.codigo AS sede_codigo,
    s.nombre AS sede_nombre,
    h.grupo,
        CASE h.grupo
            WHEN 0 THEN 'Normal (L-V)'::text
            WHEN 1 THEN 'Grupo 1'::text
            WHEN 2 THEN 'Grupo 2'::text
            ELSE NULL::text
        END AS grupo_nombre,
    h.fecha_inicio,
    h.motivo_asignacion,
    ua.nombre_completo AS asignado_por_nombre,
    h.created_at
   FROM (((public.historial_encargado_sede_grupo h
     JOIN public.usuario u ON ((u.id = h.usuario_id)))
     JOIN public.sede s ON ((s.id = h.sede_id)))
     LEFT JOIN public.usuario ua ON ((ua.id = h.asignado_por)))
  WHERE (h.fecha_fin IS NULL);


--
-- Name: v_estadisticas_brigadas; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_estadisticas_brigadas AS
 SELECT u.id AS usuario_id,
    u.nombre_completo,
    u.chapa,
    u.telefono,
    u.sede_id,
    s.nombre AS sede_nombre,
    r.nombre AS rol_nombre,
    count(DISTINCT t.id) FILTER (WHERE (t.fecha >= (CURRENT_DATE - '30 days'::interval))) AS turnos_ultimo_mes,
    count(DISTINCT t.id) FILTER (WHERE (t.fecha >= (CURRENT_DATE - '90 days'::interval))) AS turnos_ultimo_trimestre,
    max(t.fecha) AS ultimo_turno_fecha,
    (CURRENT_DATE - max(t.fecha)) AS dias_desde_ultimo_turno,
    min(t.fecha) FILTER (WHERE (t.fecha >= CURRENT_DATE)) AS proximo_turno_fecha,
    mode() WITHIN GROUP (ORDER BY tt.rol_tripulacion) AS rol_tripulacion_frecuente,
    u.activo
   FROM (((((public.usuario u
     JOIN public.sede s ON ((u.sede_id = s.id)))
     JOIN public.rol r ON ((u.rol_id = r.id)))
     LEFT JOIN public.tripulacion_turno tt ON ((u.id = tt.usuario_id)))
     LEFT JOIN public.asignacion_unidad au ON ((tt.asignacion_id = au.id)))
     LEFT JOIN public.turno t ON ((au.turno_id = t.id)))
  WHERE ((r.nombre)::text = 'BRIGADA'::text)
  GROUP BY u.id, u.nombre_completo, u.chapa, u.telefono, u.sede_id, s.nombre, r.nombre, u.activo;


--
-- Name: v_estadisticas_unidades; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_estadisticas_unidades AS
SELECT
    NULL::integer AS unidad_id,
    NULL::character varying(20) AS unidad_codigo,
    NULL::character varying(50) AS tipo_unidad,
    NULL::character varying(50) AS marca,
    NULL::character varying(50) AS modelo,
    NULL::integer AS sede_id,
    NULL::character varying(100) AS sede_nombre,
    NULL::boolean AS activa,
    NULL::numeric(6,2) AS combustible_actual,
    NULL::numeric(6,2) AS capacidad_combustible,
    NULL::numeric(10,2) AS odometro_actual,
    NULL::bigint AS turnos_ultimo_mes,
    NULL::bigint AS turnos_ultimo_trimestre,
    NULL::date AS ultimo_turno_fecha,
    NULL::integer AS dias_desde_ultimo_uso,
    NULL::date AS proximo_turno_fecha,
    NULL::numeric AS km_ultimo_mes;


--
-- Name: v_estado_grupos_actual; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_estado_grupos_actual AS
 SELECT ds.id AS departamento_id,
    ds.codigo AS departamento_codigo,
    ds.nombre AS departamento_nombre,
    s.id AS sede_id,
    s.codigo AS sede_codigo,
    s.nombre AS sede_nombre,
    egd.grupo,
        CASE egd.grupo
            WHEN 0 THEN 'Normal (L-V)'::text
            WHEN 1 THEN 'Grupo 1'::text
            WHEN 2 THEN 'Grupo 2'::text
            ELSE NULL::text
        END AS grupo_nombre,
    COALESCE(egd.activo, true) AS activo,
    egd.fecha_modificacion,
    egd.observaciones,
    u.nombre_completo AS modificado_por_nombre
   FROM ((((public.departamento_sistema ds
     CROSS JOIN public.sede s)
     CROSS JOIN ( SELECT 0 AS grupo
        UNION
         SELECT 1
        UNION
         SELECT 2) g)
     LEFT JOIN public.estado_grupo_departamento egd ON (((egd.departamento_id = ds.id) AND (egd.sede_id = s.id) AND (egd.grupo = g.grupo))))
     LEFT JOIN public.usuario u ON ((u.id = egd.modificado_por)))
  WHERE ((ds.usa_sistema_grupos = true) AND (ds.activo = true) AND (s.activa = true));


--
-- Name: v_historial_cambios_usuario; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_historial_cambios_usuario AS
 SELECT rc.id,
    rc.tipo_cambio,
    rc.usuario_afectado_id,
    u_afectado.nombre_completo AS usuario_afectado,
    rc.motivo,
    rc.valores_anteriores,
    rc.valores_nuevos,
    rc.realizado_por,
    u_realizado.nombre_completo AS realizado_por_nombre,
    rc.autorizado_por,
    u_autorizado.nombre_completo AS autorizado_por_nombre,
    rc.created_at
   FROM (((public.registro_cambio rc
     LEFT JOIN public.usuario u_afectado ON ((rc.usuario_afectado_id = u_afectado.id)))
     LEFT JOIN public.usuario u_realizado ON ((rc.realizado_por = u_realizado.id)))
     LEFT JOIN public.usuario u_autorizado ON ((rc.autorizado_por = u_autorizado.id)))
  ORDER BY rc.created_at DESC;


--
-- Name: VIEW v_historial_cambios_usuario; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_historial_cambios_usuario IS 'Historial completo de cambios con informaci??n de usuarios';


--
-- Name: v_historial_inspecciones_360; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_historial_inspecciones_360 AS
 SELECT i.id AS inspeccion_id,
    i.unidad_id,
    u.codigo AS unidad_codigo,
    u.tipo_unidad,
    i.salida_id,
    i.fecha_realizacion,
    i.fecha_aprobacion,
    i.estado,
    insp.nombre_completo AS inspector_nombre,
    insp.chapa AS inspector_chapa,
    apr.nombre_completo AS aprobador_nombre,
    apr.chapa AS aprobador_chapa,
    i.observaciones_inspector,
    i.observaciones_comandante,
    i.motivo_rechazo,
    p.nombre AS plantilla_nombre
   FROM ((((public.inspeccion_360 i
     JOIN public.unidad u ON ((i.unidad_id = u.id)))
     JOIN public.usuario insp ON ((i.realizado_por = insp.id)))
     LEFT JOIN public.usuario apr ON ((i.aprobado_por = apr.id)))
     JOIN public.plantilla_inspeccion_360 p ON ((i.plantilla_id = p.id)))
  ORDER BY i.fecha_realizacion DESC;


--
-- Name: VIEW v_historial_inspecciones_360; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_historial_inspecciones_360 IS 'Historial completo de inspecciones 360';


--
-- Name: v_historial_movimientos; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_historial_movimientos AS
 SELECT m.id,
    m.usuario_id,
    u.nombre_completo,
    m.turno_id,
    t.fecha AS turno_fecha,
    m.tipo_movimiento,
    m.origen_unidad_id,
    uo.codigo AS origen_unidad_codigo,
    m.destino_unidad_id,
    ud.codigo AS destino_unidad_codigo,
    m.hora_inicio,
    m.hora_fin,
        CASE
            WHEN (m.hora_fin IS NOT NULL) THEN (EXTRACT(epoch FROM (m.hora_fin - m.hora_inicio)) / (3600)::numeric)
            ELSE (EXTRACT(epoch FROM (now() - m.hora_inicio)) / (3600)::numeric)
        END AS duracion_horas,
    m.motivo,
    m.rol_en_destino,
    m.created_at
   FROM ((((public.movimiento_brigada m
     JOIN public.usuario u ON ((m.usuario_id = u.id)))
     LEFT JOIN public.turno t ON ((m.turno_id = t.id)))
     LEFT JOIN public.unidad uo ON ((m.origen_unidad_id = uo.id)))
     LEFT JOIN public.unidad ud ON ((m.destino_unidad_id = ud.id)))
  ORDER BY m.created_at DESC;


--
-- Name: VIEW v_historial_movimientos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_historial_movimientos IS 'Historial completo de movimientos de brigadas';


--
-- Name: v_inspecciones_360_pendientes; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_inspecciones_360_pendientes AS
 SELECT i.id AS inspeccion_id,
    i.unidad_id,
    u.codigo AS unidad_codigo,
    u.tipo_unidad,
    i.salida_id,
    i.fecha_realizacion,
    i.estado,
    insp.id AS inspector_id,
    insp.nombre_completo AS inspector_nombre,
    insp.chapa AS inspector_chapa,
    cmd.usuario_id AS comandante_id,
    cmd.nombre_completo AS comandante_nombre,
    cmd.chapa AS comandante_chapa,
    p.nombre AS plantilla_nombre,
    p.version AS plantilla_version,
    (EXTRACT(epoch FROM (now() - i.fecha_realizacion)) / (60)::numeric) AS minutos_esperando
   FROM ((((public.inspeccion_360 i
     JOIN public.unidad u ON ((i.unidad_id = u.id)))
     JOIN public.usuario insp ON ((i.realizado_por = insp.id)))
     JOIN public.plantilla_inspeccion_360 p ON ((i.plantilla_id = p.id)))
     LEFT JOIN LATERAL public.obtener_comandante_unidad(i.unidad_id) cmd(usuario_id, nombre_completo, chapa, tipo_asignacion) ON (true))
  WHERE ((i.estado)::text = 'PENDIENTE'::text)
  ORDER BY i.fecha_realizacion;


--
-- Name: VIEW v_inspecciones_360_pendientes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_inspecciones_360_pendientes IS 'Inspecciones 360 pendientes de aprobación';


--
-- Name: v_mi_asignacion_hoy; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_mi_asignacion_hoy AS
 SELECT usr.id AS usuario_id,
    usr.nombre_completo,
    t.id AS turno_id,
    t.fecha,
    t.fecha_fin,
    t.estado AS turno_estado,
    a.id AS asignacion_id,
    u.id AS unidad_id,
    u.codigo AS unidad_codigo,
    u.tipo_unidad,
    tc.rol_tripulacion AS mi_rol,
    tc.es_comandante,
    r.id AS ruta_id,
    r.codigo AS ruta_codigo,
    r.nombre AS ruta_nombre,
    a.km_inicio,
    a.km_final,
    a.sentido,
    a.acciones,
    a.estado_nomina,
        CASE
            WHEN ((a.km_inicio IS NOT NULL) AND (a.km_final IS NOT NULL)) THEN ((('Km '::text || a.km_inicio) || ' - Km '::text) || a.km_final)
            WHEN (a.km_inicio IS NOT NULL) THEN ('Desde Km '::text || a.km_inicio)
            WHEN (a.km_final IS NOT NULL) THEN ('Hasta Km '::text || a.km_final)
            ELSE NULL::text
        END AS recorrido_permitido,
    a.hora_salida,
    a.hora_entrada_estimada,
    a.hora_salida_real,
        CASE
            WHEN (t.fecha = CURRENT_DATE) THEN 0
            ELSE (t.fecha - CURRENT_DATE)
        END AS dias_para_salida,
    ( SELECT json_agg(json_build_object('usuario_id', u2.id, 'nombre', u2.nombre_completo, 'chapa', u2.chapa, 'rol', tc2.rol_tripulacion, 'telefono', u2.telefono, 'es_comandante', tc2.es_comandante) ORDER BY
                CASE tc2.rol_tripulacion
                    WHEN 'PILOTO'::text THEN 1
                    WHEN 'COPILOTO'::text THEN 2
                    WHEN 'ACOMPANANTE'::text THEN 3
                    ELSE 4
                END) AS json_agg
           FROM (public.tripulacion_turno tc2
             JOIN public.usuario u2 ON ((tc2.usuario_id = u2.id)))
          WHERE (tc2.asignacion_id = a.id)) AS tripulacion,
    ( SELECT json_agg(json_build_object('usuario_id', u2.id, 'nombre', u2.nombre_completo, 'chapa', u2.chapa, 'rol', tc2.rol_tripulacion, 'telefono', u2.telefono) ORDER BY
                CASE tc2.rol_tripulacion
                    WHEN 'PILOTO'::text THEN 1
                    WHEN 'COPILOTO'::text THEN 2
                    WHEN 'ACOMPANANTE'::text THEN 3
                    ELSE 4
                END) AS json_agg
           FROM (public.tripulacion_turno tc2
             JOIN public.usuario u2 ON ((tc2.usuario_id = u2.id)))
          WHERE ((tc2.asignacion_id = a.id) AND (tc2.usuario_id <> usr.id))) AS companeros
   FROM (((((public.usuario usr
     JOIN public.tripulacion_turno tc ON ((usr.id = tc.usuario_id)))
     JOIN public.asignacion_unidad a ON ((tc.asignacion_id = a.id)))
     JOIN public.turno t ON ((a.turno_id = t.id)))
     JOIN public.unidad u ON ((a.unidad_id = u.id)))
     LEFT JOIN public.ruta r ON ((a.ruta_id = r.id)))
  WHERE (((t.fecha >= CURRENT_DATE) OR ((t.fecha_fin IS NOT NULL) AND (t.fecha_fin >= CURRENT_DATE))) AND ((t.estado)::text = ANY ((ARRAY['PLANIFICADO'::character varying, 'ACTIVO'::character varying])::text[])) AND (a.hora_entrada_real IS NULL));


--
-- Name: VIEW v_mi_asignacion_hoy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_mi_asignacion_hoy IS 'Asignaci¢n del d¡a para un usuario (usado en app m¢vil) - Incluye tripulaci¢n completa';


--
-- Name: v_mi_salida_activa; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_mi_salida_activa AS
 SELECT u.id AS brigada_id,
    u.chapa,
    u.nombre_completo,
    s.id AS salida_id,
    s.unidad_id,
    un.codigo AS unidad_codigo,
    un.tipo_unidad,
    s.estado,
    s.fecha_hora_salida,
    s.fecha_hora_regreso,
    (EXTRACT(epoch FROM (COALESCE(s.fecha_hora_regreso, now()) - s.fecha_hora_salida)) / (3600)::numeric) AS horas_salida,
    s.ruta_inicial_id AS ruta_id,
    r.codigo AS ruta_codigo,
    r.nombre AS ruta_nombre,
    s.km_inicial,
    s.combustible_inicial,
    s.tripulacion,
    'TURNO'::text AS tipo_asignacion,
    tt.rol_tripulacion AS mi_rol,
    ( SELECT json_build_object('id', sit.id, 'tipo', sit.tipo_situacion, 'fecha_hora', sit.created_at) AS json_build_object
           FROM public.situacion sit
          WHERE (sit.salida_unidad_id = s.id)
          ORDER BY sit.created_at
         LIMIT 1) AS primera_situacion
   FROM ((((((public.usuario u
     JOIN public.tripulacion_turno tt ON ((u.id = tt.usuario_id)))
     JOIN public.asignacion_unidad au ON ((tt.asignacion_id = au.id)))
     JOIN public.turno t ON ((au.turno_id = t.id)))
     JOIN public.unidad un ON ((au.unidad_id = un.id)))
     JOIN public.salida_unidad s ON (((un.id = s.unidad_id) AND ((s.estado)::text = 'EN_SALIDA'::text))))
     LEFT JOIN public.ruta r ON ((s.ruta_inicial_id = r.id)))
  WHERE ((t.estado)::text = ANY ((ARRAY['PLANIFICADO'::character varying, 'ACTIVO'::character varying])::text[]));


--
-- Name: v_mis_alertas_no_leidas; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_mis_alertas_no_leidas AS
 SELECT a.id,
    a.tipo,
    a.severidad,
    a.estado,
    a.titulo,
    a.mensaje,
    a.datos,
    a.sede_id,
    a.unidad_id,
    a.brigada_id,
    a.situacion_id,
    a.atendida_por,
    a.fecha_atencion,
    a.nota_resolucion,
    a.fecha_expiracion,
    a.created_at,
    a.updated_at,
    s.nombre AS sede_nombre,
    u.codigo AS unidad_codigo,
    b.nombre AS brigada_nombre
   FROM (((public.alerta a
     LEFT JOIN public.sede s ON ((a.sede_id = s.id)))
     LEFT JOIN public.unidad u ON ((a.unidad_id = u.id)))
     LEFT JOIN public.brigada b ON ((a.brigada_id = b.id)))
  WHERE ((a.estado = 'ACTIVA'::public.estado_alerta) AND ((a.fecha_expiracion IS NULL) OR (a.fecha_expiracion > CURRENT_TIMESTAMP)));


--
-- Name: v_mis_aprobaciones_pendientes; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_mis_aprobaciones_pendientes AS
 SELECT at.id AS aprobacion_id,
    at.tipo,
    at.estado AS estado_aprobacion,
    at.fecha_inicio,
    at.tiempo_limite_minutos,
    at.observaciones,
    ar.usuario_id,
    ar.respuesta,
    u.codigo AS unidad_codigo,
    u.tipo_unidad,
    su.id AS salida_id,
    (EXTRACT(epoch FROM ((at.fecha_inicio + ((at.tiempo_limite_minutos || ' minutes'::text))::interval) - now())) / (60)::numeric) AS minutos_restantes,
    ui.nombre_completo AS iniciado_por_nombre
   FROM ((((public.aprobacion_respuesta ar
     JOIN public.aprobacion_tripulacion at ON ((at.id = ar.aprobacion_id)))
     JOIN public.unidad u ON ((u.id = at.unidad_id)))
     LEFT JOIN public.salida_unidad su ON ((su.id = at.salida_id)))
     LEFT JOIN public.usuario ui ON ((ui.id = at.iniciado_por)))
  WHERE (((at.estado)::text = 'PENDIENTE'::text) AND ((ar.respuesta)::text = 'PENDIENTE'::text));


--
-- Name: VIEW v_mis_aprobaciones_pendientes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_mis_aprobaciones_pendientes IS 'Aprobaciones pendientes de respuesta por usuario';


--
-- Name: v_rol_permisos_diagnostico; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_rol_permisos_diagnostico AS
 SELECT id AS rol_id,
    nombre AS rol_nombre,
    ((permisos IS NOT NULL) AND (permisos <> '{}'::jsonb)) AS usa_permisos_jsonb,
    jsonb_array_length(COALESCE(permisos, '[]'::jsonb)) AS cantidad_jsonb,
    ( SELECT count(*) AS count
           FROM public.rol_permiso rp
          WHERE (rp.rol_id = r.id)) AS cantidad_tabla,
        CASE
            WHEN ((permisos IS NOT NULL) AND (permisos <> '{}'::jsonb) AND (( SELECT count(*) AS count
               FROM public.rol_permiso rp
              WHERE (rp.rol_id = r.id)) > 0)) THEN 'CONFLICTO: Usa ambos sistemas'::text
            WHEN (( SELECT count(*) AS count
               FROM public.rol_permiso rp
              WHERE (rp.rol_id = r.id)) > 0) THEN 'OK: Usa tabla relacional'::text
            WHEN ((permisos IS NOT NULL) AND (permisos <> '{}'::jsonb)) THEN 'LEGACY: Usa JSONB (migrar a tabla)'::text
            ELSE 'SIN PERMISOS'::text
        END AS estado
   FROM public.rol r;


--
-- Name: VIEW v_rol_permisos_diagnostico; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_rol_permisos_diagnostico IS 'DiagnÃ³stico de sistema de permisos dual. Revisar antes de 093B.';


--
-- Name: v_sede_completa; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_sede_completa AS
 SELECT s.id,
    s.nombre,
    s.codigo,
    s.codigo_boleta,
    s.direccion,
    s.telefono,
    s.activa,
    s.es_sede_central,
    s.departamento_id,
    s.municipio_id,
    d.nombre AS departamento_nombre,
    m.nombre AS municipio_nombre,
    s.departamento AS departamento_legacy,
    s.municipio AS municipio_legacy,
        CASE
            WHEN ((s.departamento IS NOT NULL) AND (d.nombre IS NOT NULL) AND ((s.departamento)::text <> (d.nombre)::text)) THEN true
            ELSE false
        END AS tiene_inconsistencia_depto,
        CASE
            WHEN ((s.municipio IS NOT NULL) AND (m.nombre IS NOT NULL) AND ((s.municipio)::text <> (m.nombre)::text)) THEN true
            ELSE false
        END AS tiene_inconsistencia_muni
   FROM ((public.sede s
     LEFT JOIN public.departamento d ON ((s.departamento_id = d.id)))
     LEFT JOIN public.municipio m ON ((s.municipio_id = m.id)));


--
-- Name: VIEW v_sede_completa; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_sede_completa IS 'Vista de sede con datos normalizados. Usar esta en lugar de leer campos texto legacy.';


--
-- Name: v_situacion_decodificada; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_situacion_decodificada AS
 SELECT id,
    codigo_situacion,
    SUBSTRING(codigo_situacion FROM 1 FOR 8) AS fecha_str,
    split_part(codigo_situacion, '-'::text, 2) AS sede_id_str,
    split_part(codigo_situacion, '-'::text, 3) AS unidad_codigo,
    split_part(codigo_situacion, '-'::text, 4) AS tipo_id_str,
    split_part(codigo_situacion, '-'::text, 5) AS ruta_id_str,
    split_part(codigo_situacion, '-'::text, 6) AS km_str,
    split_part(codigo_situacion, '-'::text, 7) AS num_salida_str,
    tipo_situacion,
    estado,
    created_at
   FROM public.situacion s;


--
-- Name: v_situacion_multimedia_resumen; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_situacion_multimedia_resumen AS
 SELECT s.id AS situacion_id,
    s.codigo_situacion,
    s.tipo_situacion,
    count(sm.id) AS total_multimedia,
    count(
        CASE
            WHEN ((sm.tipo)::text = 'foto'::text) THEN 1
            ELSE NULL::integer
        END) AS total_fotos,
    count(
        CASE
            WHEN ((sm.tipo)::text = 'video'::text) THEN 1
            ELSE NULL::integer
        END) AS total_videos
   FROM (public.situacion s
     LEFT JOIN public.situacion_multimedia sm ON ((s.id = sm.situacion_id)))
  GROUP BY s.id, s.codigo_situacion, s.tipo_situacion;


--
-- Name: v_turnos_completos; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_turnos_completos AS
 SELECT t.id AS turno_id,
    t.fecha,
    t.estado AS turno_estado,
    a.id AS asignacion_id,
    a.id,
    u.codigo AS unidad_codigo,
    u.tipo_unidad,
    r.codigo AS ruta_codigo,
    r.nombre AS ruta_nombre,
    a.km_inicio,
    a.km_final,
    a.sentido,
    a.acciones,
    a.combustible_inicial,
    a.combustible_asignado,
    a.hora_salida,
    a.hora_entrada_estimada,
    a.hora_salida_real,
    a.hora_entrada_real,
    ( SELECT json_agg(json_build_object('usuario_id', usr.id, 'nombre_completo', usr.nombre_completo, 'chapa', usr.username, 'rol_tripulacion', tc.rol_tripulacion, 'presente', tc.presente) ORDER BY
                CASE tc.rol_tripulacion
                    WHEN 'PILOTO'::text THEN 1
                    WHEN 'COPILOTO'::text THEN 2
                    WHEN 'ACOMPANANTE'::text THEN 3
                    ELSE 4
                END) AS json_agg
           FROM (public.tripulacion_turno tc
             JOIN public.usuario usr ON ((tc.usuario_id = usr.id)))
          WHERE (tc.asignacion_id = a.id)) AS tripulacion,
    a.created_at
   FROM (((public.turno t
     JOIN public.asignacion_unidad a ON ((t.id = a.turno_id)))
     JOIN public.unidad u ON ((a.unidad_id = u.id)))
     LEFT JOIN public.ruta r ON ((a.ruta_id = r.id)));


--
-- Name: v_ultima_situacion_unidad; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ultima_situacion_unidad AS
 SELECT DISTINCT ON (s.unidad_id) s.id,
    s.codigo_situacion,
    s.tipo_situacion,
    s.estado,
    s.unidad_id,
    u.codigo AS unidad_codigo,
    s.ruta_id,
    r.codigo AS ruta_codigo,
    s.km,
    s.sentido,
    s.latitud,
    s.longitud,
    s.created_at,
    s.updated_at
   FROM ((public.situacion s
     LEFT JOIN public.unidad u ON ((s.unidad_id = u.id)))
     LEFT JOIN public.ruta r ON ((s.ruta_id = r.id)))
  ORDER BY s.unidad_id, s.created_at DESC;


--
-- Name: v_unidades_en_salida; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_unidades_en_salida AS
 SELECT u.id AS unidad_id,
    u.codigo AS unidad_codigo,
    u.tipo_unidad,
    s.id AS salida_id,
    s.fecha_hora_salida,
    (EXTRACT(epoch FROM (now() - s.fecha_hora_salida)) / (3600)::numeric) AS horas_en_salida,
    r.codigo AS ruta_codigo,
    r.nombre AS ruta_nombre,
    s.km_inicial,
    s.tripulacion,
    ( SELECT count(*) AS count
           FROM public.situacion sit
          WHERE (sit.salida_unidad_id = s.id)) AS total_situaciones,
    ( SELECT json_build_object('id', sit.id, 'tipo', sit.tipo_situacion, 'km', sit.km, 'fecha_hora', sit.created_at) AS json_build_object
           FROM public.situacion sit
          WHERE (sit.salida_unidad_id = s.id)
          ORDER BY sit.created_at DESC
         LIMIT 1) AS ultima_situacion
   FROM ((public.unidad u
     JOIN public.salida_unidad s ON (((u.id = s.unidad_id) AND ((s.estado)::text = 'EN_SALIDA'::text))))
     LEFT JOIN public.ruta r ON ((s.ruta_inicial_id = r.id)))
  ORDER BY s.fecha_hora_salida DESC;


--
-- Name: v_usuario_roles; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_usuario_roles AS
 SELECT u.id AS usuario_id,
    u.username,
    u.nombre_completo,
    u.sede_id AS sede_principal_id,
    sp.nombre AS sede_principal_nombre,
    ur.rol_id,
    r.nombre AS rol_nombre,
    ur.sede_id AS rol_sede_id,
    sr.nombre AS rol_sede_nombre,
    ur.es_rol_principal,
    ur.activo AS rol_activo,
    ur.fecha_asignacion
   FROM ((((public.usuario u
     JOIN public.usuario_rol ur ON ((u.id = ur.usuario_id)))
     JOIN public.rol r ON ((ur.rol_id = r.id)))
     LEFT JOIN public.sede sp ON ((u.sede_id = sp.id)))
     LEFT JOIN public.sede sr ON ((ur.sede_id = sr.id)))
  WHERE (ur.activo = true);


--
-- Name: v_usuarios_admin; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_usuarios_admin AS
 SELECT u.id,
    u.uuid,
    u.username,
    u.nombre_completo,
    u.chapa,
    u.email,
    u.telefono,
    u.activo,
    u.acceso_app_activo,
    u.grupo,
        CASE u.grupo
            WHEN 0 THEN 'Normal (L-V)'::text
            WHEN 1 THEN 'Grupo 1'::text
            WHEN 2 THEN 'Grupo 2'::text
            ELSE 'Sin asignar'::text
        END AS grupo_nombre,
    u.exento_grupos,
    u.es_encargado_grupo,
    r.nombre AS rol_codigo,
    r.nombre AS rol_nombre,
    s.id AS sede_id,
    s.codigo AS sede_codigo,
    s.nombre AS sede_nombre,
    src.codigo AS sub_rol_cop_codigo,
    src.nombre AS sub_rol_cop_nombre,
    u.ultimo_acceso,
    u.created_at
   FROM (((public.usuario u
     JOIN public.rol r ON ((r.id = u.rol_id)))
     LEFT JOIN public.sede s ON ((s.id = u.sede_id)))
     LEFT JOIN public.sub_rol_cop src ON ((src.id = u.sub_rol_cop_id)))
  ORDER BY u.nombre_completo;


--
-- Name: vehiculo_accidente; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehiculo_accidente (
    id integer NOT NULL,
    hoja_accidentologia_id integer NOT NULL,
    numero_vehiculo integer NOT NULL,
    tipo_vehiculo public.tipo_vehiculo_accidente NOT NULL,
    placa character varying(20),
    marca character varying(50),
    linea character varying(50),
    modelo_anio integer,
    color character varying(30),
    numero_chasis character varying(50),
    numero_motor character varying(50),
    danos_descripcion text,
    danos_estimados numeric(12,2),
    posicion_final text,
    propietario_nombre character varying(150),
    propietario_dpi character varying(20),
    propietario_telefono character varying(20),
    propietario_direccion text,
    conductor_nombre character varying(150),
    conductor_dpi character varying(20),
    conductor_licencia_tipo character varying(10),
    conductor_licencia_numero character varying(30),
    conductor_telefono character varying(20),
    conductor_direccion text,
    conductor_estado public.estado_persona_accidente,
    tiene_seguro boolean DEFAULT false,
    aseguradora character varying(100),
    numero_poliza character varying(50),
    fotos text[],
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    estado_ebriedad boolean DEFAULT false,
    tiene_licencia character varying(10),
    licencia_extranjera boolean DEFAULT false,
    piloto_domicilio text,
    pasajeros_ilesos integer DEFAULT 0,
    traslados jsonb DEFAULT '{}'::jsonb,
    dispositivos_seguridad character varying(30)[],
    dispositivo_otro character varying(100),
    doc_consignado_licencia boolean DEFAULT false,
    doc_consignado_tarjeta boolean DEFAULT false,
    doc_consignado_por character varying(20),
    vehiculo_consignado boolean DEFAULT false,
    vehiculo_consignado_por character varying(20),
    conductor_consignado boolean DEFAULT false,
    conductor_consignado_por character varying(20),
    acuerdo boolean,
    acuerdo_tipo character varying(30),
    licencia_transporte character varying(50),
    tarjeta_operaciones character varying(50),
    placa_remolque character varying(20),
    nit_remolque character varying(20),
    empresa character varying(150),
    doc_consignado_tarjeta_circulacion boolean DEFAULT false,
    doc_consignado_licencia_transporte boolean DEFAULT false,
    doc_consignado_tarjeta_operaciones boolean DEFAULT false,
    doc_consignado_poliza boolean DEFAULT false,
    tipo_servicio character varying(30),
    situacion_id bigint NOT NULL,
    CONSTRAINT vehiculo_acc_conductor_consig_coherente CHECK (((conductor_consignado = false) OR (conductor_consignado_por IS NOT NULL))),
    CONSTRAINT vehiculo_acc_conductor_consignado_por_check CHECK (((conductor_consignado_por IS NULL) OR ((conductor_consignado_por)::text = ANY ((ARRAY['EJERCITO'::character varying, 'PMT'::character varying, 'PNC'::character varying])::text[])))),
    CONSTRAINT vehiculo_acc_consignado_por_check CHECK (((doc_consignado_por IS NULL) OR ((doc_consignado_por)::text = ANY ((ARRAY['DGT'::character varying, 'PMT'::character varying, 'PNC'::character varying])::text[])))),
    CONSTRAINT vehiculo_acc_doc_consig_coherente CHECK ((((doc_consignado_licencia = false) AND (doc_consignado_tarjeta = false)) OR (doc_consignado_por IS NOT NULL))),
    CONSTRAINT vehiculo_acc_vehiculo_consig_coherente CHECK (((vehiculo_consignado = false) OR (vehiculo_consignado_por IS NOT NULL))),
    CONSTRAINT vehiculo_acc_vehiculo_consignado_por_check CHECK (((vehiculo_consignado_por IS NULL) OR ((vehiculo_consignado_por)::text = ANY ((ARRAY['PMT'::character varying, 'PNC'::character varying])::text[])))),
    CONSTRAINT vehiculo_accidente_acuerdo_tipo_check CHECK (((acuerdo_tipo IS NULL) OR ((acuerdo_tipo)::text = ANY ((ARRAY['ASEGURADORA'::character varying, 'INICIATIVA_PROPIA'::character varying])::text[])))),
    CONSTRAINT vehiculo_accidente_tiene_licencia_check CHECK (((tiene_licencia IS NULL) OR ((tiene_licencia)::text = ANY ((ARRAY['SI'::character varying, 'NO'::character varying, 'NO_PORTA'::character varying])::text[]))))
);


--
-- Name: TABLE vehiculo_accidente; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.vehiculo_accidente IS 'Veh¡culos involucrados en HECHO_TRANSITO (accidentes de tr nsito). Vinculados directamente a situacion.';


--
-- Name: COLUMN vehiculo_accidente.doc_consignado_tarjeta_circulacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vehiculo_accidente.doc_consignado_tarjeta_circulacion IS 'Boleta: Tarjeta de circulacion consignada.';


--
-- Name: COLUMN vehiculo_accidente.doc_consignado_licencia_transporte; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vehiculo_accidente.doc_consignado_licencia_transporte IS 'Boleta: Licencia de transporte consignada.';


--
-- Name: COLUMN vehiculo_accidente.doc_consignado_tarjeta_operaciones; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vehiculo_accidente.doc_consignado_tarjeta_operaciones IS 'Boleta: Tarjeta de operaciones consignada.';


--
-- Name: COLUMN vehiculo_accidente.doc_consignado_poliza; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vehiculo_accidente.doc_consignado_poliza IS 'Boleta: Poliza/seguro consignado.';


--
-- Name: COLUMN vehiculo_accidente.tipo_servicio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vehiculo_accidente.tipo_servicio IS 'Tipo de servicio del vehiculo: PARTICULAR, COMERCIAL, OFICIAL, DIPLOMATICO, EMERGENCIA, TRANSPORTE_PUBLICO, CARGA';


--
-- Name: COLUMN vehiculo_accidente.situacion_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vehiculo_accidente.situacion_id IS 'FK a situacion (tabla padre). Solo para tipo_situacion=HECHO_TRANSITO';


--
-- Name: vehiculo_accidente_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vehiculo_accidente_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vehiculo_accidente_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vehiculo_accidente_id_seq OWNED BY public.vehiculo_accidente.id;


--
-- Name: vehiculo_aseguradora; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehiculo_aseguradora (
    id integer NOT NULL,
    situacion_vehiculo_id integer NOT NULL,
    aseguradora_id integer,
    datos jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: vehiculo_ajustador_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vehiculo_ajustador_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vehiculo_ajustador_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vehiculo_ajustador_id_seq OWNED BY public.vehiculo_aseguradora.id;


--
-- Name: vehiculo_grua; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehiculo_grua (
    id integer NOT NULL,
    situacion_vehiculo_id integer NOT NULL,
    grua_id integer NOT NULL,
    datos jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: vehiculo_grua_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vehiculo_grua_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vehiculo_grua_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vehiculo_grua_id_seq OWNED BY public.vehiculo_grua.id;


--
-- Name: vehiculo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vehiculo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vehiculo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vehiculo_id_seq OWNED BY public.vehiculo.id;


--
-- Name: bitacora_historica_2024; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_historica ATTACH PARTITION public.bitacora_historica_2024 FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');


--
-- Name: bitacora_historica_2025; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_historica ATTACH PARTITION public.bitacora_historica_2025 FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');


--
-- Name: bitacora_historica_2026; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_historica ATTACH PARTITION public.bitacora_historica_2026 FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');


--
-- Name: actividad id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.actividad ALTER COLUMN id SET DEFAULT nextval('public.actividad_id_seq'::regclass);


--
-- Name: alerta id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerta ALTER COLUMN id SET DEFAULT nextval('public.alerta_id_seq'::regclass);


--
-- Name: alerta_leida id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerta_leida ALTER COLUMN id SET DEFAULT nextval('public.alerta_leida_id_seq'::regclass);


--
-- Name: aprobacion_respuesta id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aprobacion_respuesta ALTER COLUMN id SET DEFAULT nextval('public.aprobacion_respuesta_id_seq'::regclass);


--
-- Name: aprobacion_tripulacion id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aprobacion_tripulacion ALTER COLUMN id SET DEFAULT nextval('public.aprobacion_tripulacion_id_seq'::regclass);


--
-- Name: articulo_sancion id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articulo_sancion ALTER COLUMN id SET DEFAULT nextval('public.articulo_sancion_id_seq'::regclass);


--
-- Name: aseguradora id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aseguradora ALTER COLUMN id SET DEFAULT nextval('public.aseguradora_id_seq'::regclass);


--
-- Name: asignacion_unidad id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asignacion_unidad ALTER COLUMN id SET DEFAULT nextval('public.asignacion_unidad_id_seq'::regclass);


--
-- Name: auditoria_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditoria_log ALTER COLUMN id SET DEFAULT nextval('public.auditoria_log_id_seq'::regclass);


--
-- Name: autoridad id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.autoridad ALTER COLUMN id SET DEFAULT nextval('public.autoridad_id_seq'::regclass);


--
-- Name: aviso_asignacion id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aviso_asignacion ALTER COLUMN id SET DEFAULT nextval('public.aviso_asignacion_id_seq'::regclass);


--
-- Name: bitacora_historica id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_historica ALTER COLUMN id SET DEFAULT nextval('public.bitacora_historica_id_seq'::regclass);


--
-- Name: brigada id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brigada ALTER COLUMN id SET DEFAULT nextval('public.brigada_id_seq'::regclass);


--
-- Name: bus id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bus ALTER COLUMN id SET DEFAULT nextval('public.bus_id_seq'::regclass);


--
-- Name: campo_personalizado id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campo_personalizado ALTER COLUMN id SET DEFAULT nextval('public.campo_personalizado_id_seq'::regclass);


--
-- Name: capa_mapa id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capa_mapa ALTER COLUMN id SET DEFAULT nextval('public.capa_mapa_id_seq'::regclass);


--
-- Name: catalogo_motivo_inactividad id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalogo_motivo_inactividad ALTER COLUMN id SET DEFAULT nextval('public.catalogo_motivo_inactividad_id_seq'::regclass);


--
-- Name: catalogo_tipo_situacion id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalogo_tipo_situacion ALTER COLUMN id SET DEFAULT nextval('public.catalogo_tipo_situacion_id_seq'::regclass);


--
-- Name: causa_hecho_transito id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.causa_hecho_transito ALTER COLUMN id SET DEFAULT nextval('public.causa_hecho_transito_id_seq'::regclass);


--
-- Name: combustible_registro id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combustible_registro ALTER COLUMN id SET DEFAULT nextval('public.combustible_registro_id_seq'::regclass);


--
-- Name: configuracion_alerta id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracion_alerta ALTER COLUMN id SET DEFAULT nextval('public.configuracion_alerta_id_seq'::regclass);


--
-- Name: configuracion_columnas_tabla id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracion_columnas_tabla ALTER COLUMN id SET DEFAULT nextval('public.configuracion_columnas_tabla_id_seq'::regclass);


--
-- Name: configuracion_sistema id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracion_sistema ALTER COLUMN id SET DEFAULT nextval('public.configuracion_sistema_id_seq'::regclass);


--
-- Name: configuracion_visual_sede id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracion_visual_sede ALTER COLUMN id SET DEFAULT nextval('public.configuracion_visual_sede_id_seq'::regclass);


--
-- Name: contenedor id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contenedor ALTER COLUMN id SET DEFAULT nextval('public.contenedor_id_seq'::regclass);


--
-- Name: control_acceso_app id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_acceso_app ALTER COLUMN id SET DEFAULT nextval('public.control_acceso_app_id_seq'::regclass);


--
-- Name: debug_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.debug_log ALTER COLUMN id SET DEFAULT nextval('public.debug_log_id_seq'::regclass);


--
-- Name: departamento id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departamento ALTER COLUMN id SET DEFAULT nextval('public.departamento_id_seq'::regclass);


--
-- Name: departamento_sistema id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departamento_sistema ALTER COLUMN id SET DEFAULT nextval('public.departamento_sistema_id_seq'::regclass);


--
-- Name: dispositivo_autorizado id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispositivo_autorizado ALTER COLUMN id SET DEFAULT nextval('public.dispositivo_autorizado_id_seq'::regclass);


--
-- Name: dispositivo_push id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispositivo_push ALTER COLUMN id SET DEFAULT nextval('public.dispositivo_push_id_seq'::regclass);


--
-- Name: dispositivo_seguridad id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispositivo_seguridad ALTER COLUMN id SET DEFAULT nextval('public.dispositivo_seguridad_id_seq'::regclass);


--
-- Name: estado_grupo_departamento id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estado_grupo_departamento ALTER COLUMN id SET DEFAULT nextval('public.estado_grupo_departamento_id_seq'::regclass);


--
-- Name: estado_via id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estado_via ALTER COLUMN id SET DEFAULT nextval('public.estado_via_id_seq'::regclass);


--
-- Name: etnia id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.etnia ALTER COLUMN id SET DEFAULT nextval('public.etnia_id_seq'::regclass);


--
-- Name: geometria_via id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geometria_via ALTER COLUMN id SET DEFAULT nextval('public.geometria_via_id_seq'::regclass);


--
-- Name: grua id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grua ALTER COLUMN id SET DEFAULT nextval('public.grua_id_seq'::regclass);


--
-- Name: historial_encargado_sede_grupo id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_encargado_sede_grupo ALTER COLUMN id SET DEFAULT nextval('public.historial_encargado_sede_grupo_id_seq'::regclass);


--
-- Name: historial_ruta_brigada id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_ruta_brigada ALTER COLUMN id SET DEFAULT nextval('public.historial_ruta_brigada_id_seq'::regclass);


--
-- Name: historial_situacion_brigada id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_situacion_brigada ALTER COLUMN id SET DEFAULT nextval('public.historial_situacion_brigada_id_seq'::regclass);


--
-- Name: ingreso_sede id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingreso_sede ALTER COLUMN id SET DEFAULT nextval('public.ingreso_sede_id_seq'::regclass);


--
-- Name: inspeccion_360 id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspeccion_360 ALTER COLUMN id SET DEFAULT nextval('public.inspeccion_360_id_seq'::regclass);


--
-- Name: inspeccion_360_archivo id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspeccion_360_archivo ALTER COLUMN id SET DEFAULT nextval('public.inspeccion_360_archivo_id_seq'::regclass);


--
-- Name: intelligence_refresh_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intelligence_refresh_log ALTER COLUMN id SET DEFAULT nextval('public.intelligence_refresh_log_id_seq'::regclass);


--
-- Name: log_administracion id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_administracion ALTER COLUMN id SET DEFAULT nextval('public.log_administracion_id_seq'::regclass);


--
-- Name: marca id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marca ALTER COLUMN id SET DEFAULT nextval('public.marca_id_seq'::regclass);


--
-- Name: marca_vehiculo id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marca_vehiculo ALTER COLUMN id SET DEFAULT nextval('public.marca_vehiculo_id_seq'::regclass);


--
-- Name: motivo_no_atendido id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.motivo_no_atendido ALTER COLUMN id SET DEFAULT nextval('public.motivo_no_atendido_id_seq'::regclass);


--
-- Name: movimiento_brigada id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimiento_brigada ALTER COLUMN id SET DEFAULT nextval('public.movimiento_brigada_id_seq'::regclass);


--
-- Name: municipio id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.municipio ALTER COLUMN id SET DEFAULT nextval('public.municipio_id_seq'::regclass);


--
-- Name: notificacion id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificacion ALTER COLUMN id SET DEFAULT nextval('public.notificacion_id_seq'::regclass);


--
-- Name: password_reset_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_log ALTER COLUMN id SET DEFAULT nextval('public.password_reset_log_id_seq'::regclass);


--
-- Name: permiso id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permiso ALTER COLUMN id SET DEFAULT nextval('public.permiso_id_seq'::regclass);


--
-- Name: persona_accidente id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persona_accidente ALTER COLUMN id SET DEFAULT nextval('public.persona_accidente_id_seq'::regclass);


--
-- Name: piloto id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.piloto ALTER COLUMN id SET DEFAULT nextval('public.piloto_id_seq'::regclass);


--
-- Name: plantilla_comunicacion id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plantilla_comunicacion ALTER COLUMN id SET DEFAULT nextval('public.plantilla_comunicacion_id_seq'::regclass);


--
-- Name: plantilla_inspeccion_360 id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plantilla_inspeccion_360 ALTER COLUMN id SET DEFAULT nextval('public.plantilla_inspeccion_360_id_seq'::regclass);


--
-- Name: publicacion_social id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publicacion_social ALTER COLUMN id SET DEFAULT nextval('public.publicacion_social_id_seq'::regclass);


--
-- Name: punto_mapa id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.punto_mapa ALTER COLUMN id SET DEFAULT nextval('public.punto_mapa_id_seq'::regclass);


--
-- Name: reasignacion_sede id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reasignacion_sede ALTER COLUMN id SET DEFAULT nextval('public.reasignacion_sede_id_seq'::regclass);


--
-- Name: registro_cambio id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registro_cambio ALTER COLUMN id SET DEFAULT nextval('public.registro_cambio_id_seq'::regclass);


--
-- Name: relevo id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relevo ALTER COLUMN id SET DEFAULT nextval('public.relevo_id_seq'::regclass);


--
-- Name: reporte_horario id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reporte_horario ALTER COLUMN id SET DEFAULT nextval('public.reporte_horario_id_seq'::regclass);


--
-- Name: rol id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rol ALTER COLUMN id SET DEFAULT nextval('public.rol_id_seq'::regclass);


--
-- Name: ruta id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ruta ALTER COLUMN id SET DEFAULT nextval('public.ruta_id_seq'::regclass);


--
-- Name: salida_unidad id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salida_unidad ALTER COLUMN id SET DEFAULT nextval('public.salida_unidad_id_seq'::regclass);


--
-- Name: sancion id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sancion ALTER COLUMN id SET DEFAULT nextval('public.sancion_id_seq'::regclass);


--
-- Name: sede id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sede ALTER COLUMN id SET DEFAULT nextval('public.sede_id_seq'::regclass);


--
-- Name: situacion id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion ALTER COLUMN id SET DEFAULT nextval('public.situacion_id_seq'::regclass);


--
-- Name: situacion_causa id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion_causa ALTER COLUMN id SET DEFAULT nextval('public.situacion_causa_id_seq'::regclass);


--
-- Name: situacion_conflicto id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion_conflicto ALTER COLUMN id SET DEFAULT nextval('public.situacion_conflicto_id_seq'::regclass);


--
-- Name: situacion_multimedia id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion_multimedia ALTER COLUMN id SET DEFAULT nextval('public.situacion_multimedia_id_seq'::regclass);


--
-- Name: situacion_sesion id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion_sesion ALTER COLUMN id SET DEFAULT nextval('public.situacion_sesion_id_seq'::regclass);


--
-- Name: situacion_vehiculo id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion_vehiculo ALTER COLUMN id SET DEFAULT nextval('public.situacion_vehiculo_id_seq'::regclass);


--
-- Name: situacion_vehiculo_dispositivo id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion_vehiculo_dispositivo ALTER COLUMN id SET DEFAULT nextval('public.situacion_vehiculo_dispositivo_id_seq'::regclass);


--
-- Name: sub_rol_cop id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_rol_cop ALTER COLUMN id SET DEFAULT nextval('public.sub_rol_cop_id_seq'::regclass);


--
-- Name: suscripcion_alerta id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suscripcion_alerta ALTER COLUMN id SET DEFAULT nextval('public.suscripcion_alerta_id_seq'::regclass);


--
-- Name: tarjeta_circulacion id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tarjeta_circulacion ALTER COLUMN id SET DEFAULT nextval('public.tarjeta_circulacion_id_seq'::regclass);


--
-- Name: tipo_vehiculo id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipo_vehiculo ALTER COLUMN id SET DEFAULT nextval('public.tipo_vehiculo_id_seq'::regclass);


--
-- Name: topografia_via id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topografia_via ALTER COLUMN id SET DEFAULT nextval('public.topografia_via_id_seq'::regclass);


--
-- Name: tripulacion_turno id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tripulacion_turno ALTER COLUMN id SET DEFAULT nextval('public.tripulacion_turno_id_seq'::regclass);


--
-- Name: turno id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turno ALTER COLUMN id SET DEFAULT nextval('public.turno_id_seq'::regclass);


--
-- Name: ubicacion_brigada id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ubicacion_brigada ALTER COLUMN id SET DEFAULT nextval('public.ubicacion_brigada_id_seq'::regclass);


--
-- Name: unidad id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidad ALTER COLUMN id SET DEFAULT nextval('public.unidad_id_seq'::regclass);


--
-- Name: unidad_reparacion id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidad_reparacion ALTER COLUMN id SET DEFAULT nextval('public.unidad_reparacion_id_seq'::regclass);


--
-- Name: usuario id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario ALTER COLUMN id SET DEFAULT nextval('public.usuario_id_seq'::regclass);


--
-- Name: usuario_inactividad id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_inactividad ALTER COLUMN id SET DEFAULT nextval('public.usuario_inactividad_id_seq'::regclass);


--
-- Name: usuario_rol id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_rol ALTER COLUMN id SET DEFAULT nextval('public.usuario_rol_id_seq'::regclass);


--
-- Name: vehiculo id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehiculo ALTER COLUMN id SET DEFAULT nextval('public.vehiculo_id_seq'::regclass);


--
-- Name: vehiculo_accidente id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehiculo_accidente ALTER COLUMN id SET DEFAULT nextval('public.vehiculo_accidente_id_seq'::regclass);


--
-- Name: vehiculo_aseguradora id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehiculo_aseguradora ALTER COLUMN id SET DEFAULT nextval('public.vehiculo_ajustador_id_seq'::regclass);


--
-- Name: vehiculo_grua id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehiculo_grua ALTER COLUMN id SET DEFAULT nextval('public.vehiculo_grua_id_seq'::regclass);


--
-- Name: actividad actividad_codigo_actividad_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.actividad
    ADD CONSTRAINT actividad_codigo_actividad_key UNIQUE (codigo_actividad);


--
-- Name: actividad actividad_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.actividad
    ADD CONSTRAINT actividad_pkey PRIMARY KEY (id);


--
-- Name: alerta_leida alerta_leida_alerta_id_usuario_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerta_leida
    ADD CONSTRAINT alerta_leida_alerta_id_usuario_id_key UNIQUE (alerta_id, usuario_id);


--
-- Name: alerta_leida alerta_leida_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerta_leida
    ADD CONSTRAINT alerta_leida_pkey PRIMARY KEY (id);


--
-- Name: alerta alerta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerta
    ADD CONSTRAINT alerta_pkey PRIMARY KEY (id);


--
-- Name: aprobacion_respuesta aprobacion_respuesta_aprobacion_id_usuario_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aprobacion_respuesta
    ADD CONSTRAINT aprobacion_respuesta_aprobacion_id_usuario_id_key UNIQUE (aprobacion_id, usuario_id);


--
-- Name: aprobacion_respuesta aprobacion_respuesta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aprobacion_respuesta
    ADD CONSTRAINT aprobacion_respuesta_pkey PRIMARY KEY (id);


--
-- Name: aprobacion_tripulacion aprobacion_tripulacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aprobacion_tripulacion
    ADD CONSTRAINT aprobacion_tripulacion_pkey PRIMARY KEY (id);


--
-- Name: articulo_sancion articulo_sancion_numero_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articulo_sancion
    ADD CONSTRAINT articulo_sancion_numero_key UNIQUE (numero);


--
-- Name: articulo_sancion articulo_sancion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articulo_sancion
    ADD CONSTRAINT articulo_sancion_pkey PRIMARY KEY (id);


--
-- Name: aseguradora aseguradora_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aseguradora
    ADD CONSTRAINT aseguradora_nombre_key UNIQUE (nombre);


--
-- Name: aseguradora aseguradora_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aseguradora
    ADD CONSTRAINT aseguradora_pkey PRIMARY KEY (id);


--
-- Name: asignacion_unidad asignacion_unidad_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asignacion_unidad
    ADD CONSTRAINT asignacion_unidad_pkey PRIMARY KEY (id);


--
-- Name: asignacion_unidad asignacion_unidad_turno_id_unidad_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asignacion_unidad
    ADD CONSTRAINT asignacion_unidad_turno_id_unidad_id_key UNIQUE (turno_id, unidad_id);


--
-- Name: auditoria_log auditoria_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditoria_log
    ADD CONSTRAINT auditoria_log_pkey PRIMARY KEY (id);


--
-- Name: autoridad autoridad_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.autoridad
    ADD CONSTRAINT autoridad_pkey PRIMARY KEY (id);


--
-- Name: aviso_asignacion aviso_asignacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aviso_asignacion
    ADD CONSTRAINT aviso_asignacion_pkey PRIMARY KEY (id);


--
-- Name: bitacora_historica bitacora_historica_unidad_fecha_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_historica
    ADD CONSTRAINT bitacora_historica_unidad_fecha_unique UNIQUE (fecha, unidad_id);


--
-- Name: bitacora_historica_2024 bitacora_historica_2024_fecha_unidad_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_historica_2024
    ADD CONSTRAINT bitacora_historica_2024_fecha_unidad_id_key UNIQUE (fecha, unidad_id);


--
-- Name: bitacora_historica bitacora_historica_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_historica
    ADD CONSTRAINT bitacora_historica_pkey PRIMARY KEY (id, fecha);


--
-- Name: bitacora_historica_2024 bitacora_historica_2024_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_historica_2024
    ADD CONSTRAINT bitacora_historica_2024_pkey PRIMARY KEY (id, fecha);


--
-- Name: bitacora_historica_2025 bitacora_historica_2025_fecha_unidad_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_historica_2025
    ADD CONSTRAINT bitacora_historica_2025_fecha_unidad_id_key UNIQUE (fecha, unidad_id);


--
-- Name: bitacora_historica_2025 bitacora_historica_2025_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_historica_2025
    ADD CONSTRAINT bitacora_historica_2025_pkey PRIMARY KEY (id, fecha);


--
-- Name: bitacora_historica_2026 bitacora_historica_2026_fecha_unidad_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_historica_2026
    ADD CONSTRAINT bitacora_historica_2026_fecha_unidad_id_key UNIQUE (fecha, unidad_id);


--
-- Name: bitacora_historica_2026 bitacora_historica_2026_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_historica_2026
    ADD CONSTRAINT bitacora_historica_2026_pkey PRIMARY KEY (id, fecha);


--
-- Name: boleta_secuencia boleta_secuencia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boleta_secuencia
    ADD CONSTRAINT boleta_secuencia_pkey PRIMARY KEY (sede_id, anio);


--
-- Name: brigada brigada_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brigada
    ADD CONSTRAINT brigada_codigo_key UNIQUE (codigo);


--
-- Name: brigada brigada_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brigada
    ADD CONSTRAINT brigada_pkey PRIMARY KEY (id);


--
-- Name: brigada brigada_usuario_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brigada
    ADD CONSTRAINT brigada_usuario_id_key UNIQUE (usuario_id);


--
-- Name: bus bus_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bus
    ADD CONSTRAINT bus_pkey PRIMARY KEY (id);


--
-- Name: campo_personalizado campo_personalizado_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campo_personalizado
    ADD CONSTRAINT campo_personalizado_pkey PRIMARY KEY (id);


--
-- Name: campo_personalizado campo_personalizado_tabla_destino_clave_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campo_personalizado
    ADD CONSTRAINT campo_personalizado_tabla_destino_clave_key UNIQUE (tabla_destino, clave);


--
-- Name: capa_mapa capa_mapa_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capa_mapa
    ADD CONSTRAINT capa_mapa_pkey PRIMARY KEY (id);


--
-- Name: catalogo_motivo_inactividad catalogo_motivo_inactividad_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalogo_motivo_inactividad
    ADD CONSTRAINT catalogo_motivo_inactividad_codigo_key UNIQUE (codigo);


--
-- Name: catalogo_motivo_inactividad catalogo_motivo_inactividad_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalogo_motivo_inactividad
    ADD CONSTRAINT catalogo_motivo_inactividad_pkey PRIMARY KEY (id);


--
-- Name: catalogo_tipo_situacion catalogo_tipo_situacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalogo_tipo_situacion
    ADD CONSTRAINT catalogo_tipo_situacion_pkey PRIMARY KEY (id);


--
-- Name: causa_hecho_transito causa_hecho_transito_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.causa_hecho_transito
    ADD CONSTRAINT causa_hecho_transito_codigo_key UNIQUE (codigo);


--
-- Name: causa_hecho_transito causa_hecho_transito_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.causa_hecho_transito
    ADD CONSTRAINT causa_hecho_transito_codigo_unique UNIQUE (codigo);


--
-- Name: causa_hecho_transito causa_hecho_transito_nombre_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.causa_hecho_transito
    ADD CONSTRAINT causa_hecho_transito_nombre_unique UNIQUE (nombre);


--
-- Name: causa_hecho_transito causa_hecho_transito_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.causa_hecho_transito
    ADD CONSTRAINT causa_hecho_transito_pkey PRIMARY KEY (id);


--
-- Name: combustible_registro combustible_registro_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combustible_registro
    ADD CONSTRAINT combustible_registro_pkey PRIMARY KEY (id);


--
-- Name: configuracion_alerta configuracion_alerta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracion_alerta
    ADD CONSTRAINT configuracion_alerta_pkey PRIMARY KEY (id);


--
-- Name: configuracion_alerta configuracion_alerta_tipo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracion_alerta
    ADD CONSTRAINT configuracion_alerta_tipo_key UNIQUE (tipo);


--
-- Name: configuracion_columnas_tabla configuracion_columnas_tabla_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracion_columnas_tabla
    ADD CONSTRAINT configuracion_columnas_tabla_pkey PRIMARY KEY (id);


--
-- Name: configuracion_columnas_tabla configuracion_columnas_tabla_sede_id_tabla_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracion_columnas_tabla
    ADD CONSTRAINT configuracion_columnas_tabla_sede_id_tabla_nombre_key UNIQUE (sede_id, tabla_nombre);


--
-- Name: configuracion_sistema configuracion_sistema_clave_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracion_sistema
    ADD CONSTRAINT configuracion_sistema_clave_key UNIQUE (clave);


--
-- Name: configuracion_sistema configuracion_sistema_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracion_sistema
    ADD CONSTRAINT configuracion_sistema_pkey PRIMARY KEY (id);


--
-- Name: configuracion_visual_sede configuracion_visual_sede_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracion_visual_sede
    ADD CONSTRAINT configuracion_visual_sede_pkey PRIMARY KEY (id);


--
-- Name: configuracion_visual_sede configuracion_visual_sede_sede_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracion_visual_sede
    ADD CONSTRAINT configuracion_visual_sede_sede_id_key UNIQUE (sede_id);


--
-- Name: contenedor contenedor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contenedor
    ADD CONSTRAINT contenedor_pkey PRIMARY KEY (id);


--
-- Name: control_acceso_app control_acceso_app_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_acceso_app
    ADD CONSTRAINT control_acceso_app_pkey PRIMARY KEY (id);


--
-- Name: debug_log debug_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.debug_log
    ADD CONSTRAINT debug_log_pkey PRIMARY KEY (id);


--
-- Name: departamento departamento_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departamento
    ADD CONSTRAINT departamento_codigo_key UNIQUE (codigo);


--
-- Name: departamento departamento_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departamento
    ADD CONSTRAINT departamento_pkey PRIMARY KEY (id);


--
-- Name: departamento_sistema departamento_sistema_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departamento_sistema
    ADD CONSTRAINT departamento_sistema_codigo_key UNIQUE (codigo);


--
-- Name: departamento_sistema departamento_sistema_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departamento_sistema
    ADD CONSTRAINT departamento_sistema_pkey PRIMARY KEY (id);


--
-- Name: dispositivo_autorizado dispositivo_autorizado_device_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispositivo_autorizado
    ADD CONSTRAINT dispositivo_autorizado_device_id_key UNIQUE (device_id);


--
-- Name: dispositivo_autorizado dispositivo_autorizado_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispositivo_autorizado
    ADD CONSTRAINT dispositivo_autorizado_pkey PRIMARY KEY (id);


--
-- Name: dispositivo_push dispositivo_push_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispositivo_push
    ADD CONSTRAINT dispositivo_push_pkey PRIMARY KEY (id);


--
-- Name: dispositivo_push dispositivo_push_usuario_id_push_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispositivo_push
    ADD CONSTRAINT dispositivo_push_usuario_id_push_token_key UNIQUE (usuario_id, push_token);


--
-- Name: dispositivo_seguridad dispositivo_seguridad_nombre_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispositivo_seguridad
    ADD CONSTRAINT dispositivo_seguridad_nombre_unique UNIQUE (nombre);


--
-- Name: dispositivo_seguridad dispositivo_seguridad_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispositivo_seguridad
    ADD CONSTRAINT dispositivo_seguridad_pkey PRIMARY KEY (id);


--
-- Name: estado_grupo_departamento estado_grupo_departamento_departamento_id_sede_id_grupo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estado_grupo_departamento
    ADD CONSTRAINT estado_grupo_departamento_departamento_id_sede_id_grupo_key UNIQUE (departamento_id, sede_id, grupo);


--
-- Name: estado_grupo_departamento estado_grupo_departamento_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estado_grupo_departamento
    ADD CONSTRAINT estado_grupo_departamento_pkey PRIMARY KEY (id);


--
-- Name: estado_via estado_via_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estado_via
    ADD CONSTRAINT estado_via_codigo_key UNIQUE (codigo);


--
-- Name: estado_via estado_via_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estado_via
    ADD CONSTRAINT estado_via_pkey PRIMARY KEY (id);


--
-- Name: etnia etnia_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.etnia
    ADD CONSTRAINT etnia_nombre_key UNIQUE (nombre);


--
-- Name: etnia etnia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.etnia
    ADD CONSTRAINT etnia_pkey PRIMARY KEY (id);


--
-- Name: geometria_via geometria_via_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geometria_via
    ADD CONSTRAINT geometria_via_codigo_key UNIQUE (codigo);


--
-- Name: geometria_via geometria_via_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geometria_via
    ADD CONSTRAINT geometria_via_pkey PRIMARY KEY (id);


--
-- Name: grua grua_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grua
    ADD CONSTRAINT grua_pkey PRIMARY KEY (id);


--
-- Name: historial_encargado_sede_grupo historial_encargado_sede_grupo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_encargado_sede_grupo
    ADD CONSTRAINT historial_encargado_sede_grupo_pkey PRIMARY KEY (id);


--
-- Name: historial_ruta_brigada historial_ruta_brigada_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_ruta_brigada
    ADD CONSTRAINT historial_ruta_brigada_pkey PRIMARY KEY (id);


--
-- Name: historial_situacion_brigada historial_situacion_brigada_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_situacion_brigada
    ADD CONSTRAINT historial_situacion_brigada_pkey PRIMARY KEY (id);


--
-- Name: idempotency_keys idempotency_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.idempotency_keys
    ADD CONSTRAINT idempotency_keys_pkey PRIMARY KEY (key);


--
-- Name: ingreso_sede ingreso_sede_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingreso_sede
    ADD CONSTRAINT ingreso_sede_pkey PRIMARY KEY (id);


--
-- Name: inspeccion_360_archivo inspeccion_360_archivo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspeccion_360_archivo
    ADD CONSTRAINT inspeccion_360_archivo_pkey PRIMARY KEY (id);


--
-- Name: inspeccion_360 inspeccion_360_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspeccion_360
    ADD CONSTRAINT inspeccion_360_pkey PRIMARY KEY (id);


--
-- Name: intelligence_refresh_log intelligence_refresh_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intelligence_refresh_log
    ADD CONSTRAINT intelligence_refresh_log_pkey PRIMARY KEY (id);


--
-- Name: log_administracion log_administracion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_administracion
    ADD CONSTRAINT log_administracion_pkey PRIMARY KEY (id);


--
-- Name: marca marca_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marca
    ADD CONSTRAINT marca_nombre_key UNIQUE (nombre);


--
-- Name: marca marca_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marca
    ADD CONSTRAINT marca_pkey PRIMARY KEY (id);


--
-- Name: marca_vehiculo marca_vehiculo_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marca_vehiculo
    ADD CONSTRAINT marca_vehiculo_nombre_key UNIQUE (nombre);


--
-- Name: marca_vehiculo marca_vehiculo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marca_vehiculo
    ADD CONSTRAINT marca_vehiculo_pkey PRIMARY KEY (id);


--
-- Name: motivo_no_atendido motivo_no_atendido_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.motivo_no_atendido
    ADD CONSTRAINT motivo_no_atendido_nombre_key UNIQUE (nombre);


--
-- Name: motivo_no_atendido motivo_no_atendido_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.motivo_no_atendido
    ADD CONSTRAINT motivo_no_atendido_pkey PRIMARY KEY (id);


--
-- Name: movimiento_brigada movimiento_brigada_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimiento_brigada
    ADD CONSTRAINT movimiento_brigada_pkey PRIMARY KEY (id);


--
-- Name: municipio municipio_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.municipio
    ADD CONSTRAINT municipio_codigo_key UNIQUE (codigo);


--
-- Name: municipio municipio_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.municipio
    ADD CONSTRAINT municipio_pkey PRIMARY KEY (id);


--
-- Name: notificacion notificacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificacion
    ADD CONSTRAINT notificacion_pkey PRIMARY KEY (id);


--
-- Name: password_reset_log password_reset_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_log
    ADD CONSTRAINT password_reset_log_pkey PRIMARY KEY (id);


--
-- Name: permiso permiso_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permiso
    ADD CONSTRAINT permiso_nombre_key UNIQUE (nombre);


--
-- Name: permiso permiso_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permiso
    ADD CONSTRAINT permiso_pkey PRIMARY KEY (id);


--
-- Name: persona_accidente persona_accidente_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persona_accidente
    ADD CONSTRAINT persona_accidente_pkey PRIMARY KEY (id);


--
-- Name: piloto piloto_licencia_numero_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.piloto
    ADD CONSTRAINT piloto_licencia_numero_key UNIQUE (licencia_numero);


--
-- Name: piloto piloto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.piloto
    ADD CONSTRAINT piloto_pkey PRIMARY KEY (id);


--
-- Name: plantilla_comunicacion plantilla_comunicacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plantilla_comunicacion
    ADD CONSTRAINT plantilla_comunicacion_pkey PRIMARY KEY (id);


--
-- Name: plantilla_inspeccion_360 plantilla_inspeccion_360_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plantilla_inspeccion_360
    ADD CONSTRAINT plantilla_inspeccion_360_pkey PRIMARY KEY (id);


--
-- Name: publicacion_social publicacion_social_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publicacion_social
    ADD CONSTRAINT publicacion_social_pkey PRIMARY KEY (id);


--
-- Name: punto_mapa punto_mapa_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.punto_mapa
    ADD CONSTRAINT punto_mapa_pkey PRIMARY KEY (id);


--
-- Name: reasignacion_sede reasignacion_sede_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reasignacion_sede
    ADD CONSTRAINT reasignacion_sede_pkey PRIMARY KEY (id);


--
-- Name: registro_cambio registro_cambio_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registro_cambio
    ADD CONSTRAINT registro_cambio_pkey PRIMARY KEY (id);


--
-- Name: relevo relevo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relevo
    ADD CONSTRAINT relevo_pkey PRIMARY KEY (id);


--
-- Name: reporte_horario reporte_horario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reporte_horario
    ADD CONSTRAINT reporte_horario_pkey PRIMARY KEY (id);


--
-- Name: rol rol_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rol
    ADD CONSTRAINT rol_nombre_key UNIQUE (nombre);


--
-- Name: rol_permiso rol_permiso_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rol_permiso
    ADD CONSTRAINT rol_permiso_pkey PRIMARY KEY (rol_id, permiso_id);


--
-- Name: rol rol_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rol
    ADD CONSTRAINT rol_pkey PRIMARY KEY (id);


--
-- Name: ruta ruta_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ruta
    ADD CONSTRAINT ruta_codigo_key UNIQUE (codigo);


--
-- Name: ruta ruta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ruta
    ADD CONSTRAINT ruta_pkey PRIMARY KEY (id);


--
-- Name: salida_unidad salida_unidad_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salida_unidad
    ADD CONSTRAINT salida_unidad_pkey PRIMARY KEY (id);


--
-- Name: sancion sancion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sancion
    ADD CONSTRAINT sancion_pkey PRIMARY KEY (id);


--
-- Name: sede sede_codigo_boleta_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sede
    ADD CONSTRAINT sede_codigo_boleta_unique UNIQUE (codigo_boleta);


--
-- Name: sede sede_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sede
    ADD CONSTRAINT sede_codigo_key UNIQUE (codigo);


--
-- Name: sede sede_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sede
    ADD CONSTRAINT sede_pkey PRIMARY KEY (id);


--
-- Name: situacion_actual situacion_actual_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion_actual
    ADD CONSTRAINT situacion_actual_pkey PRIMARY KEY (unidad_id);


--
-- Name: situacion_causa situacion_causa_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion_causa
    ADD CONSTRAINT situacion_causa_pkey PRIMARY KEY (id);


--
-- Name: situacion_causa situacion_causa_situacion_id_causa_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion_causa
    ADD CONSTRAINT situacion_causa_situacion_id_causa_id_key UNIQUE (situacion_id, causa_id);


--
-- Name: situacion_conflicto situacion_conflicto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion_conflicto
    ADD CONSTRAINT situacion_conflicto_pkey PRIMARY KEY (id);


--
-- Name: situacion_draft situacion_draft_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion_draft
    ADD CONSTRAINT situacion_draft_pkey PRIMARY KEY (draft_uuid);


--
-- Name: situacion_multimedia situacion_multimedia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion_multimedia
    ADD CONSTRAINT situacion_multimedia_pkey PRIMARY KEY (id);


--
-- Name: situacion situacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion
    ADD CONSTRAINT situacion_pkey PRIMARY KEY (id);


--
-- Name: situacion_sesion situacion_sesion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion_sesion
    ADD CONSTRAINT situacion_sesion_pkey PRIMARY KEY (id);


--
-- Name: situacion_vehiculo_dispositivo situacion_vehiculo_dispositiv_situacion_vehiculo_id_disposi_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion_vehiculo_dispositivo
    ADD CONSTRAINT situacion_vehiculo_dispositiv_situacion_vehiculo_id_disposi_key UNIQUE (situacion_vehiculo_id, dispositivo_seguridad_id);


--
-- Name: situacion_vehiculo_dispositivo situacion_vehiculo_dispositivo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion_vehiculo_dispositivo
    ADD CONSTRAINT situacion_vehiculo_dispositivo_pkey PRIMARY KEY (id);


--
-- Name: situacion_vehiculo situacion_vehiculo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion_vehiculo
    ADD CONSTRAINT situacion_vehiculo_pkey PRIMARY KEY (id);


--
-- Name: sub_rol_cop sub_rol_cop_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_rol_cop
    ADD CONSTRAINT sub_rol_cop_codigo_key UNIQUE (codigo);


--
-- Name: sub_rol_cop sub_rol_cop_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_rol_cop
    ADD CONSTRAINT sub_rol_cop_pkey PRIMARY KEY (id);


--
-- Name: suscripcion_alerta suscripcion_alerta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suscripcion_alerta
    ADD CONSTRAINT suscripcion_alerta_pkey PRIMARY KEY (id);


--
-- Name: suscripcion_alerta suscripcion_alerta_usuario_id_tipo_alerta_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suscripcion_alerta
    ADD CONSTRAINT suscripcion_alerta_usuario_id_tipo_alerta_key UNIQUE (usuario_id, tipo_alerta);


--
-- Name: tarjeta_circulacion tarjeta_circulacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tarjeta_circulacion
    ADD CONSTRAINT tarjeta_circulacion_pkey PRIMARY KEY (id);


--
-- Name: tipo_vehiculo tipo_vehiculo_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipo_vehiculo
    ADD CONSTRAINT tipo_vehiculo_nombre_key UNIQUE (nombre);


--
-- Name: tipo_vehiculo tipo_vehiculo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipo_vehiculo
    ADD CONSTRAINT tipo_vehiculo_pkey PRIMARY KEY (id);


--
-- Name: topografia_via topografia_via_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topografia_via
    ADD CONSTRAINT topografia_via_codigo_key UNIQUE (codigo);


--
-- Name: topografia_via topografia_via_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topografia_via
    ADD CONSTRAINT topografia_via_pkey PRIMARY KEY (id);


--
-- Name: tripulacion_turno tripulacion_turno_asignacion_id_usuario_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tripulacion_turno
    ADD CONSTRAINT tripulacion_turno_asignacion_id_usuario_id_key UNIQUE (asignacion_id, usuario_id);


--
-- Name: tripulacion_turno tripulacion_turno_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tripulacion_turno
    ADD CONSTRAINT tripulacion_turno_pkey PRIMARY KEY (id);


--
-- Name: turno turno_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turno
    ADD CONSTRAINT turno_pkey PRIMARY KEY (id);


--
-- Name: ubicacion_brigada ubicacion_brigada_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ubicacion_brigada
    ADD CONSTRAINT ubicacion_brigada_pkey PRIMARY KEY (id);


--
-- Name: unidad unidad_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidad
    ADD CONSTRAINT unidad_codigo_key UNIQUE (codigo);


--
-- Name: unidad unidad_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidad
    ADD CONSTRAINT unidad_pkey PRIMARY KEY (id);


--
-- Name: unidad_reparacion unidad_reparacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidad_reparacion
    ADD CONSTRAINT unidad_reparacion_pkey PRIMARY KEY (id);


--
-- Name: situacion_multimedia uq_situacion_infografia_tipo_orden; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion_multimedia
    ADD CONSTRAINT uq_situacion_infografia_tipo_orden UNIQUE (situacion_id, infografia_numero, tipo, orden);


--
-- Name: usuario usuario_chapa_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_chapa_key UNIQUE (chapa);


--
-- Name: usuario_inactividad usuario_inactividad_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_inactividad
    ADD CONSTRAINT usuario_inactividad_pkey PRIMARY KEY (id);


--
-- Name: usuario usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_pkey PRIMARY KEY (id);


--
-- Name: usuario_rol usuario_rol_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_rol
    ADD CONSTRAINT usuario_rol_pkey PRIMARY KEY (id);


--
-- Name: usuario_rol usuario_rol_usuario_id_rol_id_sede_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_rol
    ADD CONSTRAINT usuario_rol_usuario_id_rol_id_sede_id_key UNIQUE (usuario_id, rol_id, sede_id);


--
-- Name: usuario usuario_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_username_key UNIQUE (username);


--
-- Name: usuario usuario_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_uuid_key UNIQUE (uuid);


--
-- Name: vehiculo_accidente vehiculo_accidente_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehiculo_accidente
    ADD CONSTRAINT vehiculo_accidente_pkey PRIMARY KEY (id);


--
-- Name: vehiculo_aseguradora vehiculo_ajustador_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehiculo_aseguradora
    ADD CONSTRAINT vehiculo_ajustador_pkey PRIMARY KEY (id);


--
-- Name: vehiculo_grua vehiculo_grua_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehiculo_grua
    ADD CONSTRAINT vehiculo_grua_pkey PRIMARY KEY (id);


--
-- Name: vehiculo vehiculo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehiculo
    ADD CONSTRAINT vehiculo_pkey PRIMARY KEY (id);


--
-- Name: vehiculo vehiculo_placa_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehiculo
    ADD CONSTRAINT vehiculo_placa_key UNIQUE (placa);


--
-- Name: idx_bitacora_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bitacora_fecha ON ONLY public.bitacora_historica USING btree (fecha DESC);


--
-- Name: bitacora_historica_2024_fecha_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bitacora_historica_2024_fecha_idx ON public.bitacora_historica_2024 USING btree (fecha DESC);


--
-- Name: idx_bitacora_fecha_unidad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bitacora_fecha_unidad ON ONLY public.bitacora_historica USING btree (fecha DESC, unidad_id);


--
-- Name: bitacora_historica_2024_fecha_unidad_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bitacora_historica_2024_fecha_unidad_id_idx ON public.bitacora_historica_2024 USING btree (fecha DESC, unidad_id);


--
-- Name: idx_bitacora_sede; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bitacora_sede ON ONLY public.bitacora_historica USING btree (sede_origen_id, fecha DESC) WHERE (sede_origen_id IS NOT NULL);


--
-- Name: bitacora_historica_2024_sede_origen_id_fecha_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bitacora_historica_2024_sede_origen_id_fecha_idx ON public.bitacora_historica_2024 USING btree (sede_origen_id, fecha DESC) WHERE (sede_origen_id IS NOT NULL);


--
-- Name: idx_bitacora_tripulacion_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bitacora_tripulacion_gin ON ONLY public.bitacora_historica USING gin (tripulacion_ids);


--
-- Name: bitacora_historica_2024_tripulacion_ids_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bitacora_historica_2024_tripulacion_ids_idx ON public.bitacora_historica_2024 USING gin (tripulacion_ids);


--
-- Name: idx_bitacora_unidad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bitacora_unidad ON ONLY public.bitacora_historica USING btree (unidad_id, fecha DESC);


--
-- Name: bitacora_historica_2024_unidad_id_fecha_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bitacora_historica_2024_unidad_id_fecha_idx ON public.bitacora_historica_2024 USING btree (unidad_id, fecha DESC);


--
-- Name: bitacora_historica_2025_fecha_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bitacora_historica_2025_fecha_idx ON public.bitacora_historica_2025 USING btree (fecha DESC);


--
-- Name: bitacora_historica_2025_fecha_unidad_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bitacora_historica_2025_fecha_unidad_id_idx ON public.bitacora_historica_2025 USING btree (fecha DESC, unidad_id);


--
-- Name: bitacora_historica_2025_sede_origen_id_fecha_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bitacora_historica_2025_sede_origen_id_fecha_idx ON public.bitacora_historica_2025 USING btree (sede_origen_id, fecha DESC) WHERE (sede_origen_id IS NOT NULL);


--
-- Name: bitacora_historica_2025_tripulacion_ids_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bitacora_historica_2025_tripulacion_ids_idx ON public.bitacora_historica_2025 USING gin (tripulacion_ids);


--
-- Name: bitacora_historica_2025_unidad_id_fecha_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bitacora_historica_2025_unidad_id_fecha_idx ON public.bitacora_historica_2025 USING btree (unidad_id, fecha DESC);


--
-- Name: bitacora_historica_2026_fecha_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bitacora_historica_2026_fecha_idx ON public.bitacora_historica_2026 USING btree (fecha DESC);


--
-- Name: bitacora_historica_2026_fecha_unidad_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bitacora_historica_2026_fecha_unidad_id_idx ON public.bitacora_historica_2026 USING btree (fecha DESC, unidad_id);


--
-- Name: bitacora_historica_2026_sede_origen_id_fecha_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bitacora_historica_2026_sede_origen_id_fecha_idx ON public.bitacora_historica_2026 USING btree (sede_origen_id, fecha DESC) WHERE (sede_origen_id IS NOT NULL);


--
-- Name: bitacora_historica_2026_tripulacion_ids_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bitacora_historica_2026_tripulacion_ids_idx ON public.bitacora_historica_2026 USING gin (tripulacion_ids);


--
-- Name: bitacora_historica_2026_unidad_id_fecha_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bitacora_historica_2026_unidad_id_fecha_idx ON public.bitacora_historica_2026 USING btree (unidad_id, fecha DESC);


--
-- Name: idx_actividad_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_actividad_created ON public.actividad USING btree (created_at DESC);


--
-- Name: idx_actividad_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_actividad_estado ON public.actividad USING btree (estado);


--
-- Name: idx_actividad_salida; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_actividad_salida ON public.actividad USING btree (salida_unidad_id);


--
-- Name: idx_actividad_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_actividad_tipo ON public.actividad USING btree (tipo_actividad_id);


--
-- Name: idx_actividad_unidad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_actividad_unidad ON public.actividad USING btree (unidad_id);


--
-- Name: idx_alerta_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alerta_created ON public.alerta USING btree (created_at DESC);


--
-- Name: idx_alerta_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alerta_estado ON public.alerta USING btree (estado);


--
-- Name: idx_alerta_sede; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alerta_sede ON public.alerta USING btree (sede_id);


--
-- Name: idx_alerta_severidad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alerta_severidad ON public.alerta USING btree (severidad);


--
-- Name: idx_alerta_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alerta_tipo ON public.alerta USING btree (tipo);


--
-- Name: idx_alerta_unidad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alerta_unidad ON public.alerta USING btree (unidad_id);


--
-- Name: idx_aprobacion_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_aprobacion_estado ON public.aprobacion_tripulacion USING btree (estado);


--
-- Name: idx_aprobacion_pendiente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_aprobacion_pendiente ON public.aprobacion_tripulacion USING btree (estado, fecha_inicio) WHERE ((estado)::text = 'PENDIENTE'::text);


--
-- Name: idx_aprobacion_respuesta_aprobacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_aprobacion_respuesta_aprobacion ON public.aprobacion_respuesta USING btree (aprobacion_id);


--
-- Name: idx_aprobacion_respuesta_pendiente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_aprobacion_respuesta_pendiente ON public.aprobacion_respuesta USING btree (aprobacion_id, respuesta) WHERE ((respuesta)::text = 'PENDIENTE'::text);


--
-- Name: idx_aprobacion_respuesta_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_aprobacion_respuesta_usuario ON public.aprobacion_respuesta USING btree (usuario_id);


--
-- Name: idx_aprobacion_salida; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_aprobacion_salida ON public.aprobacion_tripulacion USING btree (salida_id);


--
-- Name: idx_aprobacion_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_aprobacion_tipo ON public.aprobacion_tripulacion USING btree (tipo);


--
-- Name: idx_aprobacion_unidad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_aprobacion_unidad ON public.aprobacion_tripulacion USING btree (unidad_id);


--
-- Name: idx_articulo_numero; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_articulo_numero ON public.articulo_sancion USING btree (numero);


--
-- Name: idx_aseguradora_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_aseguradora_nombre ON public.aseguradora USING btree (nombre);


--
-- Name: idx_asignacion_dia_cerrado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asignacion_dia_cerrado ON public.asignacion_unidad USING btree (dia_cerrado, turno_id);


--
-- Name: idx_asignacion_ruta; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asignacion_ruta ON public.asignacion_unidad USING btree (ruta_id);


--
-- Name: idx_asignacion_ruta_activa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asignacion_ruta_activa ON public.asignacion_unidad USING btree (ruta_activa_id) WHERE (ruta_activa_id IS NOT NULL);


--
-- Name: idx_asignacion_situacion_fija; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asignacion_situacion_fija ON public.asignacion_unidad USING btree (situacion_fija_id);


--
-- Name: idx_asignacion_turno; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asignacion_turno ON public.asignacion_unidad USING btree (turno_id);


--
-- Name: idx_asignacion_turno_unidad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asignacion_turno_unidad ON public.asignacion_unidad USING btree (turno_id, unidad_id);


--
-- Name: idx_asignacion_unidad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asignacion_unidad ON public.asignacion_unidad USING btree (unidad_id);


--
-- Name: idx_asignacion_unidad_estado_nomina; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asignacion_unidad_estado_nomina ON public.asignacion_unidad USING btree (estado_nomina);


--
-- Name: idx_auditoria_accion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auditoria_accion ON public.auditoria_log USING btree (accion);


--
-- Name: idx_auditoria_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auditoria_created ON public.auditoria_log USING btree (created_at DESC);


--
-- Name: idx_auditoria_tabla; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auditoria_tabla ON public.auditoria_log USING btree (tabla_afectada);


--
-- Name: idx_auditoria_tabla_registro; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auditoria_tabla_registro ON public.auditoria_log USING btree (tabla_afectada, registro_id);


--
-- Name: idx_auditoria_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auditoria_usuario ON public.auditoria_log USING btree (usuario_id);


--
-- Name: idx_autoridad_situacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_autoridad_situacion ON public.autoridad USING btree (situacion_id);


--
-- Name: idx_autoridad_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_autoridad_tipo ON public.autoridad USING btree (tipo);


--
-- Name: idx_aviso_asignacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_aviso_asignacion ON public.aviso_asignacion USING btree (asignacion_id);


--
-- Name: idx_brigada_activa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brigada_activa ON public.brigada USING btree (activa);


--
-- Name: idx_brigada_codigo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brigada_codigo ON public.brigada USING btree (codigo);


--
-- Name: idx_brigada_sede; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brigada_sede ON public.brigada USING btree (sede_id);


--
-- Name: idx_bus_empresa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bus_empresa ON public.bus USING btree (empresa);


--
-- Name: idx_bus_vehiculo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bus_vehiculo ON public.bus USING btree (vehiculo_id);


--
-- Name: idx_capa_mapa_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_capa_mapa_activo ON public.capa_mapa USING btree (activo);


--
-- Name: idx_catalogo_tipo_situacion_categoria; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_catalogo_tipo_situacion_categoria ON public.catalogo_tipo_situacion USING btree (categoria);


--
-- Name: idx_combustible_asignacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_combustible_asignacion ON public.combustible_registro USING btree (asignacion_id);


--
-- Name: idx_combustible_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_combustible_created ON public.combustible_registro USING btree (created_at DESC);


--
-- Name: idx_combustible_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_combustible_tipo ON public.combustible_registro USING btree (tipo);


--
-- Name: idx_combustible_turno; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_combustible_turno ON public.combustible_registro USING btree (turno_id);


--
-- Name: idx_combustible_unidad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_combustible_unidad ON public.combustible_registro USING btree (unidad_id);


--
-- Name: idx_config_columnas_sede_tabla; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_columnas_sede_tabla ON public.configuracion_columnas_tabla USING btree (sede_id, tabla_nombre);


--
-- Name: idx_config_visual_sede; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_visual_sede ON public.configuracion_visual_sede USING btree (sede_id);


--
-- Name: idx_contenedor_numero; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contenedor_numero ON public.contenedor USING btree (numero_contenedor);


--
-- Name: idx_contenedor_vehiculo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contenedor_vehiculo ON public.contenedor USING btree (vehiculo_id);


--
-- Name: idx_control_acceso_grupo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_control_acceso_grupo ON public.control_acceso_app USING btree (grupo) WHERE (grupo IS NOT NULL);


--
-- Name: idx_control_acceso_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_control_acceso_usuario ON public.control_acceso_app USING btree (usuario_id) WHERE (usuario_id IS NOT NULL);


--
-- Name: idx_control_acceso_vigencia; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_control_acceso_vigencia ON public.control_acceso_app USING btree (fecha_inicio, fecha_fin);


--
-- Name: idx_departamento_codigo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_departamento_codigo ON public.departamento USING btree (codigo);


--
-- Name: idx_departamento_region; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_departamento_region ON public.departamento USING btree (region);


--
-- Name: idx_dispositivo_device_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dispositivo_device_id ON public.dispositivo_autorizado USING btree (device_id);


--
-- Name: idx_dispositivo_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dispositivo_estado ON public.dispositivo_autorizado USING btree (estado);


--
-- Name: idx_dispositivo_push_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dispositivo_push_activo ON public.dispositivo_push USING btree (activo) WHERE (activo = true);


--
-- Name: idx_dispositivo_push_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dispositivo_push_token ON public.dispositivo_push USING btree (push_token);


--
-- Name: idx_dispositivo_push_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dispositivo_push_usuario ON public.dispositivo_push USING btree (usuario_id);


--
-- Name: idx_dispositivo_usuario_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dispositivo_usuario_id ON public.dispositivo_autorizado USING btree (usuario_id);


--
-- Name: idx_estado_grupo_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estado_grupo_activo ON public.estado_grupo_departamento USING btree (activo) WHERE (activo = true);


--
-- Name: idx_estado_grupo_depto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estado_grupo_depto ON public.estado_grupo_departamento USING btree (departamento_id);


--
-- Name: idx_estado_grupo_sede; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estado_grupo_sede ON public.estado_grupo_departamento USING btree (sede_id);


--
-- Name: idx_grua_master_empresa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_grua_master_empresa ON public.grua USING btree (empresa);


--
-- Name: idx_grua_master_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_grua_master_nombre ON public.grua USING btree (nombre);


--
-- Name: idx_grua_master_placa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_grua_master_placa ON public.grua USING btree (placa);


--
-- Name: idx_historial_encargado_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_historial_encargado_activo ON public.historial_encargado_sede_grupo USING btree (sede_id, grupo) WHERE (fecha_fin IS NULL);


--
-- Name: idx_historial_encargado_fechas; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_historial_encargado_fechas ON public.historial_encargado_sede_grupo USING btree (fecha_inicio, fecha_fin);


--
-- Name: idx_historial_encargado_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_historial_encargado_usuario ON public.historial_encargado_sede_grupo USING btree (usuario_id);


--
-- Name: idx_historial_ruta_brigada_ruta; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_historial_ruta_brigada_ruta ON public.historial_ruta_brigada USING btree (ruta_id, usuario_id);


--
-- Name: idx_historial_ruta_brigada_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_historial_ruta_brigada_usuario ON public.historial_ruta_brigada USING btree (usuario_id, fecha DESC);


--
-- Name: idx_historial_situacion_brigada_situacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_historial_situacion_brigada_situacion ON public.historial_situacion_brigada USING btree (situacion_fija_id, usuario_id);


--
-- Name: idx_historial_situacion_brigada_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_historial_situacion_brigada_usuario ON public.historial_situacion_brigada USING btree (usuario_id, fecha DESC);


--
-- Name: idx_idempotency_endpoint; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_idempotency_endpoint ON public.idempotency_keys USING btree (endpoint);


--
-- Name: idx_idempotency_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_idempotency_expires ON public.idempotency_keys USING btree (expires_at);


--
-- Name: idx_ingreso_activo_por_salida; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_ingreso_activo_por_salida ON public.ingreso_sede USING btree (salida_unidad_id) WHERE (fecha_hora_salida IS NULL);


--
-- Name: INDEX idx_ingreso_activo_por_salida; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_ingreso_activo_por_salida IS 'Garantiza que una salida solo tenga un ingreso activo a la vez';


--
-- Name: idx_ingreso_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ingreso_fecha ON public.ingreso_sede USING btree (fecha_hora_ingreso DESC);


--
-- Name: idx_ingreso_salida; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ingreso_salida ON public.ingreso_sede USING btree (salida_unidad_id);


--
-- Name: idx_ingreso_sede_sede; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ingreso_sede_sede ON public.ingreso_sede USING btree (sede_id);


--
-- Name: idx_inspeccion_360_archivo_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inspeccion_360_archivo_fecha ON public.inspeccion_360_archivo USING btree (fecha_realizacion);


--
-- Name: idx_inspeccion_360_archivo_unidad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inspeccion_360_archivo_unidad ON public.inspeccion_360_archivo USING btree (unidad_id);


--
-- Name: idx_inspeccion_360_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inspeccion_360_estado ON public.inspeccion_360 USING btree (estado);


--
-- Name: idx_inspeccion_360_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inspeccion_360_fecha ON public.inspeccion_360 USING btree (fecha_realizacion DESC);


--
-- Name: idx_inspeccion_360_salida; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inspeccion_360_salida ON public.inspeccion_360 USING btree (salida_id);


--
-- Name: idx_inspeccion_360_salida_valida; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_inspeccion_360_salida_valida ON public.inspeccion_360 USING btree (salida_id) WHERE ((estado)::text = ANY (ARRAY[('PENDIENTE'::character varying)::text, ('APROBADA'::character varying)::text]));


--
-- Name: idx_inspeccion_360_unidad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inspeccion_360_unidad ON public.inspeccion_360 USING btree (unidad_id);


--
-- Name: idx_log_admin_accion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_log_admin_accion ON public.log_administracion USING btree (accion);


--
-- Name: idx_log_admin_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_log_admin_fecha ON public.log_administracion USING btree (created_at DESC);


--
-- Name: idx_log_admin_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_log_admin_usuario ON public.log_administracion USING btree (usuario_afectado_id);


--
-- Name: idx_marca_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marca_nombre ON public.marca USING btree (nombre);


--
-- Name: idx_motivo_no_atendido_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_motivo_no_atendido_activo ON public.motivo_no_atendido USING btree (activo);


--
-- Name: idx_movimiento_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movimiento_activo ON public.movimiento_brigada USING btree (hora_fin) WHERE (hora_fin IS NULL);


--
-- Name: idx_movimiento_brigada_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movimiento_brigada_usuario ON public.movimiento_brigada USING btree (usuario_id);


--
-- Name: idx_movimiento_destino; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movimiento_destino ON public.movimiento_brigada USING btree (destino_asignacion_id);


--
-- Name: idx_movimiento_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movimiento_fecha ON public.movimiento_brigada USING btree (created_at DESC);


--
-- Name: idx_movimiento_origen; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movimiento_origen ON public.movimiento_brigada USING btree (origen_asignacion_id);


--
-- Name: idx_movimiento_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movimiento_tipo ON public.movimiento_brigada USING btree (tipo_movimiento);


--
-- Name: idx_movimiento_turno; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movimiento_turno ON public.movimiento_brigada USING btree (turno_id);


--
-- Name: idx_movimiento_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movimiento_usuario ON public.movimiento_brigada USING btree (usuario_id);


--
-- Name: idx_multimedia_cloudinary; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_multimedia_cloudinary ON public.situacion_multimedia USING btree (cloudinary_public_id) WHERE (cloudinary_public_id IS NOT NULL);


--
-- Name: idx_multimedia_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_multimedia_created ON public.situacion_multimedia USING btree (created_at DESC);


--
-- Name: idx_multimedia_draft; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_multimedia_draft ON public.situacion_multimedia USING btree (draft_uuid) WHERE (draft_uuid IS NOT NULL);


--
-- Name: idx_multimedia_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_multimedia_estado ON public.situacion_multimedia USING btree (estado);


--
-- Name: idx_multimedia_infografia; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_multimedia_infografia ON public.situacion_multimedia USING btree (situacion_id, infografia_numero);


--
-- Name: idx_multimedia_situacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_multimedia_situacion ON public.situacion_multimedia USING btree (situacion_id);


--
-- Name: idx_multimedia_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_multimedia_tipo ON public.situacion_multimedia USING btree (tipo);


--
-- Name: idx_municipio_codigo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_municipio_codigo ON public.municipio USING btree (codigo);


--
-- Name: idx_municipio_departamento; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_municipio_departamento ON public.municipio USING btree (departamento_id);


--
-- Name: idx_municipio_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_municipio_nombre ON public.municipio USING btree (nombre);


--
-- Name: idx_notificacion_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notificacion_fecha ON public.notificacion USING btree (created_at DESC);


--
-- Name: idx_notificacion_no_leida; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notificacion_no_leida ON public.notificacion USING btree (usuario_id, leida) WHERE (leida = false);


--
-- Name: idx_notificacion_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notificacion_tipo ON public.notificacion USING btree (tipo);


--
-- Name: idx_notificacion_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notificacion_usuario ON public.notificacion USING btree (usuario_id);


--
-- Name: idx_password_reset_log_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_log_fecha ON public.password_reset_log USING btree (fecha_habilitacion);


--
-- Name: idx_password_reset_log_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_log_usuario ON public.password_reset_log USING btree (usuario_id);


--
-- Name: idx_persona_accidente_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_persona_accidente_estado ON public.persona_accidente USING btree (estado);


--
-- Name: idx_persona_accidente_hoja; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_persona_accidente_hoja ON public.persona_accidente USING btree (hoja_accidentologia_id);


--
-- Name: idx_persona_accidente_situacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_persona_accidente_situacion ON public.persona_accidente USING btree (situacion_id);


--
-- Name: idx_persona_accidente_sv; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_persona_accidente_sv ON public.persona_accidente USING btree (situacion_vehiculo_id);


--
-- Name: idx_piloto_licencia; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_piloto_licencia ON public.piloto USING btree (licencia_numero);


--
-- Name: idx_piloto_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_piloto_nombre ON public.piloto USING btree (nombre);


--
-- Name: idx_plantilla_360_activa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plantilla_360_activa ON public.plantilla_inspeccion_360 USING btree (activa) WHERE (activa = true);


--
-- Name: idx_plantilla_360_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plantilla_360_tipo ON public.plantilla_inspeccion_360 USING btree (tipo_unidad);


--
-- Name: idx_plantilla_360_tipo_activa; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_plantilla_360_tipo_activa ON public.plantilla_inspeccion_360 USING btree (tipo_unidad) WHERE (activa = true);


--
-- Name: idx_publicacion_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_publicacion_fecha ON public.publicacion_social USING btree (fecha_publicacion);


--
-- Name: idx_publicacion_situacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_publicacion_situacion ON public.publicacion_social USING btree (situacion_id);


--
-- Name: idx_punto_mapa_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_punto_mapa_activo ON public.punto_mapa USING btree (activo);


--
-- Name: idx_punto_mapa_capa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_punto_mapa_capa ON public.punto_mapa USING btree (capa_id);


--
-- Name: idx_punto_mapa_coords; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_punto_mapa_coords ON public.punto_mapa USING btree (latitud, longitud);


--
-- Name: idx_reasignacion_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reasignacion_estado ON public.reasignacion_sede USING btree (estado);


--
-- Name: idx_reasignacion_fechas; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reasignacion_fechas ON public.reasignacion_sede USING btree (fecha_inicio, fecha_fin);


--
-- Name: idx_reasignacion_tipo_recurso; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reasignacion_tipo_recurso ON public.reasignacion_sede USING btree (tipo, recurso_id);


--
-- Name: idx_registro_asignacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_registro_asignacion ON public.registro_cambio USING btree (asignacion_id);


--
-- Name: idx_registro_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_registro_fecha ON public.registro_cambio USING btree (created_at DESC);


--
-- Name: idx_registro_realizado_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_registro_realizado_por ON public.registro_cambio USING btree (realizado_por);


--
-- Name: idx_registro_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_registro_tipo ON public.registro_cambio USING btree (tipo_cambio);


--
-- Name: idx_registro_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_registro_usuario ON public.registro_cambio USING btree (usuario_afectado_id);


--
-- Name: idx_relevo_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_relevo_fecha ON public.relevo USING btree (fecha_hora DESC);


--
-- Name: idx_relevo_situacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_relevo_situacion ON public.relevo USING btree (situacion_id);


--
-- Name: idx_relevo_unidad_entrante; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_relevo_unidad_entrante ON public.relevo USING btree (unidad_entrante_id);


--
-- Name: idx_relevo_unidad_saliente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_relevo_unidad_saliente ON public.relevo USING btree (unidad_saliente_id);


--
-- Name: idx_reparacion_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reparacion_estado ON public.unidad_reparacion USING btree (estado);


--
-- Name: idx_reparacion_unidad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reparacion_unidad ON public.unidad_reparacion USING btree (unidad_id);


--
-- Name: idx_reporte_asignacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reporte_asignacion ON public.reporte_horario USING btree (asignacion_id);


--
-- Name: idx_reporte_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reporte_created ON public.reporte_horario USING btree (created_at DESC);


--
-- Name: idx_ruta_activa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ruta_activa ON public.ruta USING btree (activa);


--
-- Name: idx_ruta_codigo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ruta_codigo ON public.ruta USING btree (codigo);


--
-- Name: idx_salida_activa_por_unidad; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_salida_activa_por_unidad ON public.salida_unidad USING btree (unidad_id) WHERE ((estado)::text = 'EN_SALIDA'::text);


--
-- Name: INDEX idx_salida_activa_por_unidad; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_salida_activa_por_unidad IS 'Garantiza que una unidad solo tenga una salida activa a la vez';


--
-- Name: idx_salida_inspeccion_360; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_salida_inspeccion_360 ON public.salida_unidad USING btree (inspeccion_360_id);


--
-- Name: idx_salida_sede_origen; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_salida_sede_origen ON public.salida_unidad USING btree (sede_origen_id);


--
-- Name: idx_salida_unidad_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_salida_unidad_estado ON public.salida_unidad USING btree (estado);


--
-- Name: idx_salida_unidad_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_salida_unidad_fecha ON public.salida_unidad USING btree (fecha_hora_salida DESC);


--
-- Name: idx_salida_unidad_unidad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_salida_unidad_unidad ON public.salida_unidad USING btree (unidad_id);


--
-- Name: idx_sancion_articulo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sancion_articulo ON public.sancion USING btree (articulo_sancion_id);


--
-- Name: idx_sancion_piloto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sancion_piloto ON public.sancion USING btree (piloto_id);


--
-- Name: idx_sancion_vehiculo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sancion_vehiculo ON public.sancion USING btree (vehiculo_id);


--
-- Name: idx_sede_activa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sede_activa ON public.sede USING btree (activa);


--
-- Name: idx_sede_codigo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sede_codigo ON public.sede USING btree (codigo);


--
-- Name: idx_situacion_actual_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_situacion_actual_estado ON public.situacion_actual USING btree (estado);


--
-- Name: idx_situacion_actual_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_situacion_actual_tipo ON public.situacion_actual USING btree (tipo_situacion);


--
-- Name: idx_situacion_actual_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_situacion_actual_updated ON public.situacion_actual USING btree (updated_at DESC);


--
-- Name: idx_situacion_asignacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_situacion_asignacion ON public.situacion USING btree (asignacion_id);


--
-- Name: idx_situacion_carga; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_situacion_carga ON public.situacion USING btree (carga_vehicular) WHERE (carga_vehicular IS NOT NULL);


--
-- Name: idx_situacion_clima; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_situacion_clima ON public.situacion USING btree (clima) WHERE (clima IS NOT NULL);


--
-- Name: idx_situacion_codigo_boleta; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_situacion_codigo_boleta ON public.situacion USING btree (codigo_boleta) WHERE (codigo_boleta IS NOT NULL);


--
-- Name: idx_situacion_codigo_unico; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_situacion_codigo_unico ON public.situacion USING btree (codigo_situacion) WHERE (codigo_situacion IS NOT NULL);


--
-- Name: idx_situacion_conflicto_codigo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_situacion_conflicto_codigo ON public.situacion_conflicto USING btree (codigo_situacion);


--
-- Name: idx_situacion_conflicto_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_situacion_conflicto_created ON public.situacion_conflicto USING btree (created_at DESC);


--
-- Name: idx_situacion_conflicto_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_situacion_conflicto_estado ON public.situacion_conflicto USING btree (estado);


--
-- Name: idx_situacion_conflicto_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_situacion_conflicto_tipo ON public.situacion_conflicto USING btree (tipo_conflicto);


--
-- Name: idx_situacion_conflicto_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_situacion_conflicto_usuario ON public.situacion_conflicto USING btree (usuario_reporta);


--
-- Name: idx_situacion_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_situacion_created ON public.situacion USING btree (created_at DESC);


--
-- Name: idx_situacion_departamento; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_situacion_departamento ON public.situacion USING btree (departamento_id);


--
-- Name: idx_situacion_draft_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_situacion_draft_created ON public.situacion_draft USING btree (created_at DESC);


--
-- Name: idx_situacion_draft_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_situacion_draft_estado ON public.situacion_draft USING btree (estado_sync);


--
-- Name: idx_situacion_draft_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_situacion_draft_tipo ON public.situacion_draft USING btree (tipo_situacion);


--
-- Name: idx_situacion_draft_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_situacion_draft_usuario ON public.situacion_draft USING btree (usuario_id);


--
-- Name: idx_situacion_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_situacion_estado ON public.situacion USING btree (estado);


--
-- Name: idx_situacion_fecha_aviso; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_situacion_fecha_aviso ON public.situacion USING btree (fecha_hora_aviso) WHERE (fecha_hora_aviso IS NOT NULL);


--
-- Name: idx_situacion_municipio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_situacion_municipio ON public.situacion USING btree (municipio_id);


--
-- Name: idx_situacion_numero_boleta; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_situacion_numero_boleta ON public.situacion USING btree (numero_boleta) WHERE (numero_boleta IS NOT NULL);


--
-- Name: idx_situacion_origen; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_situacion_origen ON public.situacion USING btree (origen);


--
-- Name: idx_situacion_origen_datos; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_situacion_origen_datos ON public.situacion USING btree (origen_datos);


--
-- Name: idx_situacion_salida; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_situacion_salida ON public.situacion USING btree (salida_unidad_id);


--
-- Name: idx_situacion_sesion_situacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_situacion_sesion_situacion ON public.situacion_sesion USING btree (situacion_id);


--
-- Name: idx_situacion_sesion_unidad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_situacion_sesion_unidad ON public.situacion_sesion USING btree (unidad_id);


--
-- Name: idx_situacion_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_situacion_tipo ON public.situacion USING btree (tipo_situacion);


--
-- Name: idx_situacion_turno; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_situacion_turno ON public.situacion USING btree (turno_id);


--
-- Name: idx_situacion_unidad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_situacion_unidad ON public.situacion USING btree (unidad_id);


--
-- Name: idx_situacion_vehiculo_sit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_situacion_vehiculo_sit ON public.situacion_vehiculo USING btree (situacion_id);


--
-- Name: idx_situacion_vehiculo_veh; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_situacion_vehiculo_veh ON public.situacion_vehiculo USING btree (vehiculo_id);


--
-- Name: idx_tc_nit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tc_nit ON public.tarjeta_circulacion USING btree (nit);


--
-- Name: idx_tc_numero; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tc_numero ON public.tarjeta_circulacion USING btree (numero);


--
-- Name: idx_tc_vehiculo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tc_vehiculo ON public.tarjeta_circulacion USING btree (vehiculo_id);


--
-- Name: idx_tipo_vehiculo_categoria; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tipo_vehiculo_categoria ON public.tipo_vehiculo USING btree (categoria);


--
-- Name: idx_tipo_vehiculo_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tipo_vehiculo_nombre ON public.tipo_vehiculo USING btree (nombre);


--
-- Name: idx_tripulacion_asignacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tripulacion_asignacion ON public.tripulacion_turno USING btree (asignacion_id);


--
-- Name: idx_tripulacion_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tripulacion_usuario ON public.tripulacion_turno USING btree (usuario_id);


--
-- Name: idx_tripulacion_usuario_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tripulacion_usuario_fecha ON public.tripulacion_turno USING btree (usuario_id, created_at);


--
-- Name: idx_turno_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_turno_estado ON public.turno USING btree (estado);


--
-- Name: idx_turno_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_turno_fecha ON public.turno USING btree (fecha DESC);


--
-- Name: idx_turno_fecha_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_turno_fecha_estado ON public.turno USING btree (fecha, estado);


--
-- Name: idx_turno_publicado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_turno_publicado ON public.turno USING btree (publicado, fecha);


--
-- Name: idx_turno_sede; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_turno_sede ON public.turno USING btree (sede_id);


--
-- Name: idx_ubicacion_brigada_activa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ubicacion_brigada_activa ON public.ubicacion_brigada USING btree (usuario_id, fin_ubicacion) WHERE (fin_ubicacion IS NULL);


--
-- Name: idx_ubicacion_brigada_origen; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ubicacion_brigada_origen ON public.ubicacion_brigada USING btree (unidad_origen_id);


--
-- Name: idx_ubicacion_brigada_unidad_actual; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ubicacion_brigada_unidad_actual ON public.ubicacion_brigada USING btree (unidad_actual_id) WHERE (fin_ubicacion IS NULL);


--
-- Name: idx_ubicacion_brigada_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ubicacion_brigada_usuario ON public.ubicacion_brigada USING btree (usuario_id);


--
-- Name: idx_un_piloto_por_asignacion; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_un_piloto_por_asignacion ON public.tripulacion_turno USING btree (asignacion_id) WHERE ((rol_tripulacion)::text = 'PILOTO'::text);


--
-- Name: INDEX idx_un_piloto_por_asignacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_un_piloto_por_asignacion IS 'Garantiza que cada unidad tenga exactamente un piloto';


--
-- Name: idx_unidad_activa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_unidad_activa ON public.unidad USING btree (activa);


--
-- Name: idx_unidad_codigo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_unidad_codigo ON public.unidad USING btree (codigo);


--
-- Name: idx_unidad_combustible; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_unidad_combustible ON public.unidad USING btree (combustible_actual) WHERE (activa = true);


--
-- Name: idx_unidad_sede; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_unidad_sede ON public.unidad USING btree (sede_id);


--
-- Name: idx_usuario_acceso; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuario_acceso ON public.usuario USING btree (acceso_app_activo);


--
-- Name: idx_usuario_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuario_activo ON public.usuario USING btree (activo);


--
-- Name: idx_usuario_chapa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuario_chapa ON public.usuario USING btree (chapa);


--
-- Name: idx_usuario_exento; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuario_exento ON public.usuario USING btree (exento_grupos) WHERE (exento_grupos = true);


--
-- Name: idx_usuario_grupo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuario_grupo ON public.usuario USING btree (grupo) WHERE (grupo IS NOT NULL);


--
-- Name: idx_usuario_inactividad_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuario_inactividad_activo ON public.usuario_inactividad USING btree (fecha_fin_real) WHERE (fecha_fin_real IS NULL);


--
-- Name: idx_usuario_inactividad_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuario_inactividad_usuario ON public.usuario_inactividad USING btree (usuario_id);


--
-- Name: idx_usuario_password_reset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuario_password_reset ON public.usuario USING btree (password_reset_required) WHERE (password_reset_required = true);


--
-- Name: idx_usuario_rol; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuario_rol ON public.usuario USING btree (rol_id);


--
-- Name: idx_usuario_rol_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuario_rol_activo ON public.usuario_rol USING btree (activo) WHERE (activo = true);


--
-- Name: idx_usuario_rol_brigada; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuario_rol_brigada ON public.usuario USING btree (rol_brigada) WHERE (rol_brigada IS NOT NULL);


--
-- Name: idx_usuario_rol_rol; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuario_rol_rol ON public.usuario_rol USING btree (rol_id);


--
-- Name: idx_usuario_rol_sede; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuario_rol_sede ON public.usuario_rol USING btree (sede_id);


--
-- Name: idx_usuario_rol_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuario_rol_usuario ON public.usuario_rol USING btree (usuario_id);


--
-- Name: idx_usuario_sede; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuario_sede ON public.usuario USING btree (sede_id);


--
-- Name: idx_usuario_sub_rol_cop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuario_sub_rol_cop ON public.usuario USING btree (sub_rol_cop_id);


--
-- Name: idx_usuario_telefono; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuario_telefono ON public.usuario USING btree (telefono) WHERE (telefono IS NOT NULL);


--
-- Name: idx_usuario_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuario_username ON public.usuario USING btree (username);


--
-- Name: idx_vehiculo_accidente_hoja; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehiculo_accidente_hoja ON public.vehiculo_accidente USING btree (hoja_accidentologia_id);


--
-- Name: idx_vehiculo_accidente_situacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehiculo_accidente_situacion ON public.vehiculo_accidente USING btree (situacion_id);


--
-- Name: idx_vehiculo_ajustador_aseg; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehiculo_ajustador_aseg ON public.vehiculo_aseguradora USING btree (aseguradora_id);


--
-- Name: idx_vehiculo_ajustador_sv; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehiculo_ajustador_sv ON public.vehiculo_aseguradora USING btree (situacion_vehiculo_id);


--
-- Name: idx_vehiculo_grua_grua; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehiculo_grua_grua ON public.vehiculo_grua USING btree (grua_id);


--
-- Name: idx_vehiculo_grua_sv; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehiculo_grua_sv ON public.vehiculo_grua USING btree (situacion_vehiculo_id);


--
-- Name: idx_vehiculo_master_marca; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehiculo_master_marca ON public.vehiculo USING btree (marca_id);


--
-- Name: idx_vehiculo_master_placa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehiculo_master_placa ON public.vehiculo USING btree (placa);


--
-- Name: idx_vehiculo_master_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehiculo_master_tipo ON public.vehiculo USING btree (tipo_vehiculo_id);


--
-- Name: mv_pilotos_problematicos_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX mv_pilotos_problematicos_id_idx ON public.mv_pilotos_problematicos USING btree (id);


--
-- Name: mv_pilotos_problematicos_id_idx1; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX mv_pilotos_problematicos_id_idx1 ON public.mv_pilotos_problematicos USING btree (id);


--
-- Name: mv_pilotos_problematicos_id_idx2; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX mv_pilotos_problematicos_id_idx2 ON public.mv_pilotos_problematicos USING btree (id);


--
-- Name: mv_pilotos_problematicos_licencia_numero_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mv_pilotos_problematicos_licencia_numero_idx ON public.mv_pilotos_problematicos USING btree (licencia_numero);


--
-- Name: mv_pilotos_problematicos_licencia_numero_idx1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mv_pilotos_problematicos_licencia_numero_idx1 ON public.mv_pilotos_problematicos USING btree (licencia_numero);


--
-- Name: mv_pilotos_problematicos_licencia_numero_idx2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mv_pilotos_problematicos_licencia_numero_idx2 ON public.mv_pilotos_problematicos USING btree (licencia_numero);


--
-- Name: mv_pilotos_problematicos_licencia_vencida_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mv_pilotos_problematicos_licencia_vencida_idx ON public.mv_pilotos_problematicos USING btree (licencia_vencida) WHERE (licencia_vencida = true);


--
-- Name: mv_pilotos_problematicos_licencia_vencida_idx1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mv_pilotos_problematicos_licencia_vencida_idx1 ON public.mv_pilotos_problematicos USING btree (licencia_vencida) WHERE (licencia_vencida = true);


--
-- Name: mv_pilotos_problematicos_licencia_vencida_idx2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mv_pilotos_problematicos_licencia_vencida_idx2 ON public.mv_pilotos_problematicos USING btree (licencia_vencida) WHERE (licencia_vencida = true);


--
-- Name: mv_pilotos_problematicos_nivel_riesgo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mv_pilotos_problematicos_nivel_riesgo_idx ON public.mv_pilotos_problematicos USING btree (nivel_riesgo DESC);


--
-- Name: mv_pilotos_problematicos_nivel_riesgo_idx1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mv_pilotos_problematicos_nivel_riesgo_idx1 ON public.mv_pilotos_problematicos USING btree (nivel_riesgo DESC);


--
-- Name: mv_pilotos_problematicos_nivel_riesgo_idx2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mv_pilotos_problematicos_nivel_riesgo_idx2 ON public.mv_pilotos_problematicos USING btree (nivel_riesgo DESC);


--
-- Name: mv_vehiculos_reincidentes_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX mv_vehiculos_reincidentes_id_idx ON public.mv_vehiculos_reincidentes USING btree (id);


--
-- Name: mv_vehiculos_reincidentes_id_idx1; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX mv_vehiculos_reincidentes_id_idx1 ON public.mv_vehiculos_reincidentes USING btree (id);


--
-- Name: mv_vehiculos_reincidentes_id_idx2; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX mv_vehiculos_reincidentes_id_idx2 ON public.mv_vehiculos_reincidentes USING btree (id);


--
-- Name: mv_vehiculos_reincidentes_nivel_riesgo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mv_vehiculos_reincidentes_nivel_riesgo_idx ON public.mv_vehiculos_reincidentes USING btree (nivel_riesgo DESC);


--
-- Name: mv_vehiculos_reincidentes_nivel_riesgo_idx1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mv_vehiculos_reincidentes_nivel_riesgo_idx1 ON public.mv_vehiculos_reincidentes USING btree (nivel_riesgo DESC);


--
-- Name: mv_vehiculos_reincidentes_nivel_riesgo_idx2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mv_vehiculos_reincidentes_nivel_riesgo_idx2 ON public.mv_vehiculos_reincidentes USING btree (nivel_riesgo DESC);


--
-- Name: mv_vehiculos_reincidentes_placa_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mv_vehiculos_reincidentes_placa_idx ON public.mv_vehiculos_reincidentes USING btree (placa);


--
-- Name: mv_vehiculos_reincidentes_placa_idx1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mv_vehiculos_reincidentes_placa_idx1 ON public.mv_vehiculos_reincidentes USING btree (placa);


--
-- Name: mv_vehiculos_reincidentes_placa_idx2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mv_vehiculos_reincidentes_placa_idx2 ON public.mv_vehiculos_reincidentes USING btree (placa);


--
-- Name: uniq_multimedia_cloudinary_public_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_multimedia_cloudinary_public_id ON public.situacion_multimedia USING btree (cloudinary_public_id) WHERE (cloudinary_public_id IS NOT NULL);


--
-- Name: uq_tipo_vehiculo_codigo; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_tipo_vehiculo_codigo ON public.tipo_vehiculo USING btree (codigo) WHERE (codigo IS NOT NULL);


--
-- Name: usuario_email_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX usuario_email_unique ON public.usuario USING btree (email) WHERE ((email IS NOT NULL) AND ((email)::text <> ''::text));


--
-- Name: bitacora_historica_2024_fecha_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_bitacora_fecha ATTACH PARTITION public.bitacora_historica_2024_fecha_idx;


--
-- Name: bitacora_historica_2024_fecha_unidad_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_bitacora_fecha_unidad ATTACH PARTITION public.bitacora_historica_2024_fecha_unidad_id_idx;


--
-- Name: bitacora_historica_2024_fecha_unidad_id_key; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.bitacora_historica_unidad_fecha_unique ATTACH PARTITION public.bitacora_historica_2024_fecha_unidad_id_key;


--
-- Name: bitacora_historica_2024_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.bitacora_historica_pkey ATTACH PARTITION public.bitacora_historica_2024_pkey;


--
-- Name: bitacora_historica_2024_sede_origen_id_fecha_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_bitacora_sede ATTACH PARTITION public.bitacora_historica_2024_sede_origen_id_fecha_idx;


--
-- Name: bitacora_historica_2024_tripulacion_ids_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_bitacora_tripulacion_gin ATTACH PARTITION public.bitacora_historica_2024_tripulacion_ids_idx;


--
-- Name: bitacora_historica_2024_unidad_id_fecha_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_bitacora_unidad ATTACH PARTITION public.bitacora_historica_2024_unidad_id_fecha_idx;


--
-- Name: bitacora_historica_2025_fecha_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_bitacora_fecha ATTACH PARTITION public.bitacora_historica_2025_fecha_idx;


--
-- Name: bitacora_historica_2025_fecha_unidad_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_bitacora_fecha_unidad ATTACH PARTITION public.bitacora_historica_2025_fecha_unidad_id_idx;


--
-- Name: bitacora_historica_2025_fecha_unidad_id_key; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.bitacora_historica_unidad_fecha_unique ATTACH PARTITION public.bitacora_historica_2025_fecha_unidad_id_key;


--
-- Name: bitacora_historica_2025_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.bitacora_historica_pkey ATTACH PARTITION public.bitacora_historica_2025_pkey;


--
-- Name: bitacora_historica_2025_sede_origen_id_fecha_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_bitacora_sede ATTACH PARTITION public.bitacora_historica_2025_sede_origen_id_fecha_idx;


--
-- Name: bitacora_historica_2025_tripulacion_ids_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_bitacora_tripulacion_gin ATTACH PARTITION public.bitacora_historica_2025_tripulacion_ids_idx;


--
-- Name: bitacora_historica_2025_unidad_id_fecha_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_bitacora_unidad ATTACH PARTITION public.bitacora_historica_2025_unidad_id_fecha_idx;


--
-- Name: bitacora_historica_2026_fecha_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_bitacora_fecha ATTACH PARTITION public.bitacora_historica_2026_fecha_idx;


--
-- Name: bitacora_historica_2026_fecha_unidad_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_bitacora_fecha_unidad ATTACH PARTITION public.bitacora_historica_2026_fecha_unidad_id_idx;


--
-- Name: bitacora_historica_2026_fecha_unidad_id_key; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.bitacora_historica_unidad_fecha_unique ATTACH PARTITION public.bitacora_historica_2026_fecha_unidad_id_key;


--
-- Name: bitacora_historica_2026_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.bitacora_historica_pkey ATTACH PARTITION public.bitacora_historica_2026_pkey;


--
-- Name: bitacora_historica_2026_sede_origen_id_fecha_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_bitacora_sede ATTACH PARTITION public.bitacora_historica_2026_sede_origen_id_fecha_idx;


--
-- Name: bitacora_historica_2026_tripulacion_ids_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_bitacora_tripulacion_gin ATTACH PARTITION public.bitacora_historica_2026_tripulacion_ids_idx;


--
-- Name: bitacora_historica_2026_unidad_id_fecha_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_bitacora_unidad ATTACH PARTITION public.bitacora_historica_2026_unidad_id_fecha_idx;


--
-- Name: v_estadisticas_unidades _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.v_estadisticas_unidades AS
 SELECT un.id AS unidad_id,
    un.codigo AS unidad_codigo,
    un.tipo_unidad,
    un.marca,
    un.modelo,
    un.sede_id,
    s.nombre AS sede_nombre,
    un.activa,
    un.combustible_actual,
    un.capacidad_combustible,
    un.odometro_actual,
    count(DISTINCT au.id) FILTER (WHERE (t.fecha >= (CURRENT_DATE - '30 days'::interval))) AS turnos_ultimo_mes,
    count(DISTINCT au.id) FILTER (WHERE (t.fecha >= (CURRENT_DATE - '90 days'::interval))) AS turnos_ultimo_trimestre,
    max(t.fecha) AS ultimo_turno_fecha,
    (CURRENT_DATE - max(t.fecha)) AS dias_desde_ultimo_uso,
    min(t.fecha) FILTER (WHERE (t.fecha >= CURRENT_DATE)) AS proximo_turno_fecha,
    sum(au.km_recorridos) FILTER (WHERE (t.fecha >= (CURRENT_DATE - '30 days'::interval))) AS km_ultimo_mes
   FROM (((public.unidad un
     JOIN public.sede s ON ((un.sede_id = s.id)))
     LEFT JOIN public.asignacion_unidad au ON ((un.id = au.unidad_id)))
     LEFT JOIN public.turno t ON ((au.turno_id = t.id)))
  GROUP BY un.id, un.codigo, un.tipo_unidad, un.marca, un.modelo, un.sede_id, s.nombre;


--
-- Name: aprobacion_tripulacion tr_aprobacion_tripulacion_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_aprobacion_tripulacion_updated BEFORE UPDATE ON public.aprobacion_tripulacion FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dispositivo_push tr_dispositivo_push_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_dispositivo_push_updated BEFORE UPDATE ON public.dispositivo_push FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sede tr_sync_sede_ubicacion; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_sync_sede_ubicacion BEFORE UPDATE ON public.sede FOR EACH ROW EXECUTE FUNCTION public.tr_fn_sync_sede_ubicacion();


--
-- Name: actividad trg_actividad_actualizar_actual; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_actividad_actualizar_actual AFTER INSERT OR UPDATE ON public.actividad FOR EACH ROW WHEN ((new.unidad_id IS NOT NULL)) EXECUTE FUNCTION public.fn_actualizar_situacion_actual_actividad();


--
-- Name: configuracion_columnas_tabla trg_config_columnas_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_config_columnas_updated_at BEFORE UPDATE ON public.configuracion_columnas_tabla FOR EACH ROW EXECUTE FUNCTION public.update_config_columnas_updated_at();


--
-- Name: situacion trg_situacion_actualizar_actual; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_situacion_actualizar_actual AFTER INSERT OR UPDATE ON public.situacion FOR EACH ROW WHEN ((new.unidad_id IS NOT NULL)) EXECUTE FUNCTION public.fn_actualizar_situacion_actual();


--
-- Name: asignacion_unidad trg_validar_asignacion_unidad; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validar_asignacion_unidad BEFORE INSERT OR UPDATE OF unidad_id, turno_id ON public.asignacion_unidad FOR EACH ROW EXECUTE FUNCTION public.trigger_validar_asignacion_unidad();


--
-- Name: asignacion_unidad trigger_asignacion_auditar_cierre; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_asignacion_auditar_cierre BEFORE UPDATE ON public.asignacion_unidad FOR EACH ROW WHEN ((old.dia_cerrado = true)) EXECUTE FUNCTION public.trigger_auditar_cambio_asignacion_cerrada();


--
-- Name: reporte_horario trigger_calcular_km_recorridos; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_calcular_km_recorridos AFTER INSERT ON public.reporte_horario FOR EACH ROW EXECUTE FUNCTION public.calcular_km_recorridos();


--
-- Name: situacion trigger_situacion_actualizar_ruta_activa; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_situacion_actualizar_ruta_activa AFTER INSERT ON public.situacion FOR EACH ROW EXECUTE FUNCTION public.trigger_actualizar_ruta_activa();


--
-- Name: situacion trigger_situacion_auditar_cierre; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_situacion_auditar_cierre BEFORE UPDATE ON public.situacion FOR EACH ROW EXECUTE FUNCTION public.trigger_auditar_cambio_situacion_cerrada();


--
-- Name: situacion_draft trigger_situacion_draft_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_situacion_draft_updated BEFORE UPDATE ON public.situacion_draft FOR EACH ROW EXECUTE FUNCTION public.update_situacion_draft_updated_at();


--
-- Name: combustible_registro trigger_update_combustible_unidad; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_combustible_unidad AFTER INSERT ON public.combustible_registro FOR EACH ROW EXECUTE FUNCTION public.update_combustible_unidad();


--
-- Name: sancion trigger_update_piloto_sancion_stats; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_piloto_sancion_stats AFTER INSERT ON public.sancion FOR EACH ROW EXECUTE FUNCTION public.update_piloto_sancion_stats();


--
-- Name: usuario trigger_usuario_validar_suspension; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_usuario_validar_suspension BEFORE UPDATE ON public.usuario FOR EACH ROW WHEN ((old.acceso_app_activo IS DISTINCT FROM new.acceso_app_activo)) EXECUTE FUNCTION public.trigger_validar_suspension_acceso();


--
-- Name: TRIGGER trigger_usuario_validar_suspension ON usuario; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TRIGGER trigger_usuario_validar_suspension ON public.usuario IS 'Valida que un usuario pueda tener su acceso suspendido';


--
-- Name: asignacion_unidad update_asignacion_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_asignacion_updated_at BEFORE UPDATE ON public.asignacion_unidad FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: configuracion_visual_sede update_config_visual_sede_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_config_visual_sede_updated_at BEFORE UPDATE ON public.configuracion_visual_sede FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: grua update_grua_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_grua_updated_at BEFORE UPDATE ON public.grua FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ingreso_sede update_ingreso_sede_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ingreso_sede_updated_at BEFORE UPDATE ON public.ingreso_sede FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: inspeccion_360 update_inspeccion_360_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_inspeccion_360_updated_at BEFORE UPDATE ON public.inspeccion_360 FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: movimiento_brigada update_movimiento_brigada_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_movimiento_brigada_updated_at BEFORE UPDATE ON public.movimiento_brigada FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: piloto update_piloto_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_piloto_updated_at BEFORE UPDATE ON public.piloto FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: plantilla_inspeccion_360 update_plantilla_360_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_plantilla_360_updated_at BEFORE UPDATE ON public.plantilla_inspeccion_360 FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: reasignacion_sede update_reasignacion_sede_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_reasignacion_sede_updated_at BEFORE UPDATE ON public.reasignacion_sede FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: salida_unidad update_salida_unidad_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_salida_unidad_updated_at BEFORE UPDATE ON public.salida_unidad FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sede update_sede_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sede_updated_at BEFORE UPDATE ON public.sede FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: situacion update_situacion_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_situacion_updated_at BEFORE UPDATE ON public.situacion FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sub_rol_cop update_sub_rol_cop_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sub_rol_cop_updated_at BEFORE UPDATE ON public.sub_rol_cop FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: turno update_turno_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_turno_updated_at BEFORE UPDATE ON public.turno FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: unidad update_unidad_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_unidad_updated_at BEFORE UPDATE ON public.unidad FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: usuario update_usuario_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_usuario_updated_at BEFORE UPDATE ON public.usuario FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: vehiculo update_vehiculo_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_vehiculo_updated_at BEFORE UPDATE ON public.vehiculo FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: actividad actividad_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.actividad
    ADD CONSTRAINT actividad_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuario(id);


--
-- Name: actividad actividad_ruta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.actividad
    ADD CONSTRAINT actividad_ruta_id_fkey FOREIGN KEY (ruta_id) REFERENCES public.ruta(id);


--
-- Name: actividad actividad_salida_unidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.actividad
    ADD CONSTRAINT actividad_salida_unidad_id_fkey FOREIGN KEY (salida_unidad_id) REFERENCES public.salida_unidad(id);


--
-- Name: actividad actividad_tipo_actividad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.actividad
    ADD CONSTRAINT actividad_tipo_actividad_id_fkey FOREIGN KEY (tipo_actividad_id) REFERENCES public.catalogo_tipo_situacion(id);


--
-- Name: actividad actividad_unidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.actividad
    ADD CONSTRAINT actividad_unidad_id_fkey FOREIGN KEY (unidad_id) REFERENCES public.unidad(id);


--
-- Name: alerta alerta_atendida_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerta
    ADD CONSTRAINT alerta_atendida_por_fkey FOREIGN KEY (atendida_por) REFERENCES public.usuario(id);


--
-- Name: alerta alerta_brigada_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerta
    ADD CONSTRAINT alerta_brigada_id_fkey FOREIGN KEY (brigada_id) REFERENCES public.brigada(id);


--
-- Name: alerta_leida alerta_leida_alerta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerta_leida
    ADD CONSTRAINT alerta_leida_alerta_id_fkey FOREIGN KEY (alerta_id) REFERENCES public.alerta(id) ON DELETE CASCADE;


--
-- Name: alerta_leida alerta_leida_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerta_leida
    ADD CONSTRAINT alerta_leida_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id);


--
-- Name: alerta alerta_sede_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerta
    ADD CONSTRAINT alerta_sede_id_fkey FOREIGN KEY (sede_id) REFERENCES public.sede(id);


--
-- Name: alerta alerta_unidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerta
    ADD CONSTRAINT alerta_unidad_id_fkey FOREIGN KEY (unidad_id) REFERENCES public.unidad(id);


--
-- Name: aprobacion_respuesta aprobacion_respuesta_aprobacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aprobacion_respuesta
    ADD CONSTRAINT aprobacion_respuesta_aprobacion_id_fkey FOREIGN KEY (aprobacion_id) REFERENCES public.aprobacion_tripulacion(id) ON DELETE CASCADE;


--
-- Name: aprobacion_respuesta aprobacion_respuesta_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aprobacion_respuesta
    ADD CONSTRAINT aprobacion_respuesta_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id);


--
-- Name: aprobacion_tripulacion aprobacion_tripulacion_iniciado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aprobacion_tripulacion
    ADD CONSTRAINT aprobacion_tripulacion_iniciado_por_fkey FOREIGN KEY (iniciado_por) REFERENCES public.usuario(id);


--
-- Name: aprobacion_tripulacion aprobacion_tripulacion_inspeccion_360_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aprobacion_tripulacion
    ADD CONSTRAINT aprobacion_tripulacion_inspeccion_360_id_fkey FOREIGN KEY (inspeccion_360_id) REFERENCES public.inspeccion_360(id) ON DELETE CASCADE;


--
-- Name: aprobacion_tripulacion aprobacion_tripulacion_salida_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aprobacion_tripulacion
    ADD CONSTRAINT aprobacion_tripulacion_salida_id_fkey FOREIGN KEY (salida_id) REFERENCES public.salida_unidad(id) ON DELETE CASCADE;


--
-- Name: aprobacion_tripulacion aprobacion_tripulacion_unidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aprobacion_tripulacion
    ADD CONSTRAINT aprobacion_tripulacion_unidad_id_fkey FOREIGN KEY (unidad_id) REFERENCES public.unidad(id);


--
-- Name: aseguradora aseguradora_vehiculo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aseguradora
    ADD CONSTRAINT aseguradora_vehiculo_id_fkey FOREIGN KEY (vehiculo_id) REFERENCES public.vehiculo(id);


--
-- Name: asignacion_unidad asignacion_unidad_cerrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asignacion_unidad
    ADD CONSTRAINT asignacion_unidad_cerrado_por_fkey FOREIGN KEY (cerrado_por) REFERENCES public.usuario(id) ON DELETE SET NULL;


--
-- Name: asignacion_unidad asignacion_unidad_ruta_activa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asignacion_unidad
    ADD CONSTRAINT asignacion_unidad_ruta_activa_id_fkey FOREIGN KEY (ruta_activa_id) REFERENCES public.ruta(id) ON DELETE SET NULL;


--
-- Name: asignacion_unidad asignacion_unidad_ruta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asignacion_unidad
    ADD CONSTRAINT asignacion_unidad_ruta_id_fkey FOREIGN KEY (ruta_id) REFERENCES public.ruta(id) ON DELETE SET NULL;


--
-- Name: asignacion_unidad asignacion_unidad_turno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asignacion_unidad
    ADD CONSTRAINT asignacion_unidad_turno_id_fkey FOREIGN KEY (turno_id) REFERENCES public.turno(id) ON DELETE CASCADE;


--
-- Name: asignacion_unidad asignacion_unidad_unidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asignacion_unidad
    ADD CONSTRAINT asignacion_unidad_unidad_id_fkey FOREIGN KEY (unidad_id) REFERENCES public.unidad(id) ON DELETE RESTRICT;


--
-- Name: auditoria_log auditoria_log_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditoria_log
    ADD CONSTRAINT auditoria_log_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE SET NULL;


--
-- Name: autoridad autoridad_situacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.autoridad
    ADD CONSTRAINT autoridad_situacion_id_fkey FOREIGN KEY (situacion_id) REFERENCES public.situacion(id) ON DELETE CASCADE;


--
-- Name: aviso_asignacion aviso_asignacion_asignacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aviso_asignacion
    ADD CONSTRAINT aviso_asignacion_asignacion_id_fkey FOREIGN KEY (asignacion_id) REFERENCES public.asignacion_unidad(id) ON DELETE CASCADE;


--
-- Name: aviso_asignacion aviso_asignacion_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aviso_asignacion
    ADD CONSTRAINT aviso_asignacion_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuario(id);


--
-- Name: bitacora_historica bitacora_historica_finalizado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.bitacora_historica
    ADD CONSTRAINT bitacora_historica_finalizado_por_fkey FOREIGN KEY (finalizado_por) REFERENCES public.usuario(id) ON DELETE SET NULL;


--
-- Name: bitacora_historica bitacora_historica_ruta_inicial_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.bitacora_historica
    ADD CONSTRAINT bitacora_historica_ruta_inicial_id_fkey FOREIGN KEY (ruta_inicial_id) REFERENCES public.ruta(id) ON DELETE SET NULL;


--
-- Name: bitacora_historica bitacora_historica_sede_origen_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.bitacora_historica
    ADD CONSTRAINT bitacora_historica_sede_origen_id_fkey FOREIGN KEY (sede_origen_id) REFERENCES public.sede(id) ON DELETE SET NULL;


--
-- Name: bitacora_historica bitacora_historica_unidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.bitacora_historica
    ADD CONSTRAINT bitacora_historica_unidad_id_fkey FOREIGN KEY (unidad_id) REFERENCES public.unidad(id) ON DELETE RESTRICT;


--
-- Name: boleta_secuencia boleta_secuencia_sede_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boleta_secuencia
    ADD CONSTRAINT boleta_secuencia_sede_id_fkey FOREIGN KEY (sede_id) REFERENCES public.sede(id) ON DELETE RESTRICT;


--
-- Name: brigada brigada_sede_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brigada
    ADD CONSTRAINT brigada_sede_id_fkey FOREIGN KEY (sede_id) REFERENCES public.sede(id) ON DELETE RESTRICT;


--
-- Name: brigada brigada_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brigada
    ADD CONSTRAINT brigada_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE SET NULL;


--
-- Name: bus bus_vehiculo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bus
    ADD CONSTRAINT bus_vehiculo_id_fkey FOREIGN KEY (vehiculo_id) REFERENCES public.vehiculo(id) ON DELETE CASCADE;


--
-- Name: campo_personalizado campo_personalizado_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campo_personalizado
    ADD CONSTRAINT campo_personalizado_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuario(id);


--
-- Name: capa_mapa capa_mapa_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capa_mapa
    ADD CONSTRAINT capa_mapa_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.usuario(id);


--
-- Name: combustible_registro combustible_registro_asignacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combustible_registro
    ADD CONSTRAINT combustible_registro_asignacion_id_fkey FOREIGN KEY (asignacion_id) REFERENCES public.asignacion_unidad(id) ON DELETE SET NULL;


--
-- Name: combustible_registro combustible_registro_registrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combustible_registro
    ADD CONSTRAINT combustible_registro_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES public.usuario(id) ON DELETE RESTRICT;


--
-- Name: combustible_registro combustible_registro_turno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combustible_registro
    ADD CONSTRAINT combustible_registro_turno_id_fkey FOREIGN KEY (turno_id) REFERENCES public.turno(id) ON DELETE SET NULL;


--
-- Name: combustible_registro combustible_registro_unidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combustible_registro
    ADD CONSTRAINT combustible_registro_unidad_id_fkey FOREIGN KEY (unidad_id) REFERENCES public.unidad(id) ON DELETE CASCADE;


--
-- Name: configuracion_columnas_tabla configuracion_columnas_tabla_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracion_columnas_tabla
    ADD CONSTRAINT configuracion_columnas_tabla_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuario(id);


--
-- Name: configuracion_columnas_tabla configuracion_columnas_tabla_sede_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracion_columnas_tabla
    ADD CONSTRAINT configuracion_columnas_tabla_sede_id_fkey FOREIGN KEY (sede_id) REFERENCES public.sede(id) ON DELETE CASCADE;


--
-- Name: configuracion_sistema configuracion_sistema_modificado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracion_sistema
    ADD CONSTRAINT configuracion_sistema_modificado_por_fkey FOREIGN KEY (modificado_por) REFERENCES public.usuario(id);


--
-- Name: configuracion_visual_sede configuracion_visual_sede_sede_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracion_visual_sede
    ADD CONSTRAINT configuracion_visual_sede_sede_id_fkey FOREIGN KEY (sede_id) REFERENCES public.sede(id) ON DELETE CASCADE;


--
-- Name: contenedor contenedor_vehiculo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contenedor
    ADD CONSTRAINT contenedor_vehiculo_id_fkey FOREIGN KEY (vehiculo_id) REFERENCES public.vehiculo(id) ON DELETE CASCADE;


--
-- Name: control_acceso_app control_acceso_app_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_acceso_app
    ADD CONSTRAINT control_acceso_app_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuario(id) ON DELETE RESTRICT;


--
-- Name: control_acceso_app control_acceso_app_sede_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_acceso_app
    ADD CONSTRAINT control_acceso_app_sede_id_fkey FOREIGN KEY (sede_id) REFERENCES public.sede(id) ON DELETE CASCADE;


--
-- Name: control_acceso_app control_acceso_app_unidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_acceso_app
    ADD CONSTRAINT control_acceso_app_unidad_id_fkey FOREIGN KEY (unidad_id) REFERENCES public.unidad(id) ON DELETE CASCADE;


--
-- Name: control_acceso_app control_acceso_app_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_acceso_app
    ADD CONSTRAINT control_acceso_app_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE CASCADE;


--
-- Name: dispositivo_autorizado dispositivo_autorizado_aprobado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispositivo_autorizado
    ADD CONSTRAINT dispositivo_autorizado_aprobado_por_fkey FOREIGN KEY (aprobado_por) REFERENCES public.usuario(id) ON DELETE SET NULL;


--
-- Name: dispositivo_autorizado dispositivo_autorizado_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispositivo_autorizado
    ADD CONSTRAINT dispositivo_autorizado_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE SET NULL;


--
-- Name: dispositivo_push dispositivo_push_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispositivo_push
    ADD CONSTRAINT dispositivo_push_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE CASCADE;


--
-- Name: estado_grupo_departamento estado_grupo_departamento_departamento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estado_grupo_departamento
    ADD CONSTRAINT estado_grupo_departamento_departamento_id_fkey FOREIGN KEY (departamento_id) REFERENCES public.departamento_sistema(id) ON DELETE CASCADE;


--
-- Name: estado_grupo_departamento estado_grupo_departamento_modificado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estado_grupo_departamento
    ADD CONSTRAINT estado_grupo_departamento_modificado_por_fkey FOREIGN KEY (modificado_por) REFERENCES public.usuario(id);


--
-- Name: estado_grupo_departamento estado_grupo_departamento_sede_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estado_grupo_departamento
    ADD CONSTRAINT estado_grupo_departamento_sede_id_fkey FOREIGN KEY (sede_id) REFERENCES public.sede(id) ON DELETE CASCADE;


--
-- Name: persona_accidente fk_persona_accidente_situacion; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persona_accidente
    ADD CONSTRAINT fk_persona_accidente_situacion FOREIGN KEY (situacion_id) REFERENCES public.situacion(id) ON DELETE CASCADE;


--
-- Name: vehiculo_accidente fk_vehiculo_accidente_situacion; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehiculo_accidente
    ADD CONSTRAINT fk_vehiculo_accidente_situacion FOREIGN KEY (situacion_id) REFERENCES public.situacion(id) ON DELETE CASCADE;


--
-- Name: grua grua_ruta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grua
    ADD CONSTRAINT grua_ruta_id_fkey FOREIGN KEY (ruta_id) REFERENCES public.ruta(id);


--
-- Name: historial_encargado_sede_grupo historial_encargado_sede_grupo_asignado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_encargado_sede_grupo
    ADD CONSTRAINT historial_encargado_sede_grupo_asignado_por_fkey FOREIGN KEY (asignado_por) REFERENCES public.usuario(id);


--
-- Name: historial_encargado_sede_grupo historial_encargado_sede_grupo_removido_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_encargado_sede_grupo
    ADD CONSTRAINT historial_encargado_sede_grupo_removido_por_fkey FOREIGN KEY (removido_por) REFERENCES public.usuario(id);


--
-- Name: historial_encargado_sede_grupo historial_encargado_sede_grupo_sede_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_encargado_sede_grupo
    ADD CONSTRAINT historial_encargado_sede_grupo_sede_id_fkey FOREIGN KEY (sede_id) REFERENCES public.sede(id) ON DELETE CASCADE;


--
-- Name: historial_encargado_sede_grupo historial_encargado_sede_grupo_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_encargado_sede_grupo
    ADD CONSTRAINT historial_encargado_sede_grupo_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE CASCADE;


--
-- Name: historial_ruta_brigada historial_ruta_brigada_asignacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_ruta_brigada
    ADD CONSTRAINT historial_ruta_brigada_asignacion_id_fkey FOREIGN KEY (asignacion_id) REFERENCES public.asignacion_unidad(id) ON DELETE SET NULL;


--
-- Name: historial_ruta_brigada historial_ruta_brigada_ruta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_ruta_brigada
    ADD CONSTRAINT historial_ruta_brigada_ruta_id_fkey FOREIGN KEY (ruta_id) REFERENCES public.ruta(id) ON DELETE CASCADE;


--
-- Name: historial_ruta_brigada historial_ruta_brigada_turno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_ruta_brigada
    ADD CONSTRAINT historial_ruta_brigada_turno_id_fkey FOREIGN KEY (turno_id) REFERENCES public.turno(id) ON DELETE SET NULL;


--
-- Name: historial_ruta_brigada historial_ruta_brigada_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_ruta_brigada
    ADD CONSTRAINT historial_ruta_brigada_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE CASCADE;


--
-- Name: historial_situacion_brigada historial_situacion_brigada_asignacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_situacion_brigada
    ADD CONSTRAINT historial_situacion_brigada_asignacion_id_fkey FOREIGN KEY (asignacion_id) REFERENCES public.asignacion_unidad(id) ON DELETE SET NULL;


--
-- Name: historial_situacion_brigada historial_situacion_brigada_turno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_situacion_brigada
    ADD CONSTRAINT historial_situacion_brigada_turno_id_fkey FOREIGN KEY (turno_id) REFERENCES public.turno(id) ON DELETE SET NULL;


--
-- Name: historial_situacion_brigada historial_situacion_brigada_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_situacion_brigada
    ADD CONSTRAINT historial_situacion_brigada_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE CASCADE;


--
-- Name: ingreso_sede ingreso_sede_registrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingreso_sede
    ADD CONSTRAINT ingreso_sede_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES public.usuario(id) ON DELETE RESTRICT;


--
-- Name: ingreso_sede ingreso_sede_salida_unidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingreso_sede
    ADD CONSTRAINT ingreso_sede_salida_unidad_id_fkey FOREIGN KEY (salida_unidad_id) REFERENCES public.salida_unidad(id) ON DELETE CASCADE;


--
-- Name: ingreso_sede ingreso_sede_sede_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingreso_sede
    ADD CONSTRAINT ingreso_sede_sede_id_fkey FOREIGN KEY (sede_id) REFERENCES public.sede(id) ON DELETE RESTRICT;


--
-- Name: inspeccion_360 inspeccion_360_aprobado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspeccion_360
    ADD CONSTRAINT inspeccion_360_aprobado_por_fkey FOREIGN KEY (aprobado_por) REFERENCES public.usuario(id) ON DELETE SET NULL;


--
-- Name: inspeccion_360 inspeccion_360_plantilla_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspeccion_360
    ADD CONSTRAINT inspeccion_360_plantilla_id_fkey FOREIGN KEY (plantilla_id) REFERENCES public.plantilla_inspeccion_360(id) ON DELETE RESTRICT;


--
-- Name: inspeccion_360 inspeccion_360_realizado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspeccion_360
    ADD CONSTRAINT inspeccion_360_realizado_por_fkey FOREIGN KEY (realizado_por) REFERENCES public.usuario(id) ON DELETE RESTRICT;


--
-- Name: inspeccion_360 inspeccion_360_salida_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspeccion_360
    ADD CONSTRAINT inspeccion_360_salida_id_fkey FOREIGN KEY (salida_id) REFERENCES public.salida_unidad(id) ON DELETE CASCADE;


--
-- Name: inspeccion_360 inspeccion_360_unidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspeccion_360
    ADD CONSTRAINT inspeccion_360_unidad_id_fkey FOREIGN KEY (unidad_id) REFERENCES public.unidad(id) ON DELETE RESTRICT;


--
-- Name: log_administracion log_administracion_realizado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_administracion
    ADD CONSTRAINT log_administracion_realizado_por_fkey FOREIGN KEY (realizado_por) REFERENCES public.usuario(id);


--
-- Name: log_administracion log_administracion_usuario_afectado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_administracion
    ADD CONSTRAINT log_administracion_usuario_afectado_id_fkey FOREIGN KEY (usuario_afectado_id) REFERENCES public.usuario(id);


--
-- Name: movimiento_brigada movimiento_brigada_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimiento_brigada
    ADD CONSTRAINT movimiento_brigada_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuario(id) ON DELETE RESTRICT;


--
-- Name: movimiento_brigada movimiento_brigada_destino_asignacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimiento_brigada
    ADD CONSTRAINT movimiento_brigada_destino_asignacion_id_fkey FOREIGN KEY (destino_asignacion_id) REFERENCES public.asignacion_unidad(id) ON DELETE CASCADE;


--
-- Name: movimiento_brigada movimiento_brigada_destino_unidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimiento_brigada
    ADD CONSTRAINT movimiento_brigada_destino_unidad_id_fkey FOREIGN KEY (destino_unidad_id) REFERENCES public.unidad(id) ON DELETE RESTRICT;


--
-- Name: movimiento_brigada movimiento_brigada_origen_asignacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimiento_brigada
    ADD CONSTRAINT movimiento_brigada_origen_asignacion_id_fkey FOREIGN KEY (origen_asignacion_id) REFERENCES public.asignacion_unidad(id) ON DELETE CASCADE;


--
-- Name: movimiento_brigada movimiento_brigada_origen_unidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimiento_brigada
    ADD CONSTRAINT movimiento_brigada_origen_unidad_id_fkey FOREIGN KEY (origen_unidad_id) REFERENCES public.unidad(id) ON DELETE RESTRICT;


--
-- Name: movimiento_brigada movimiento_brigada_ruta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimiento_brigada
    ADD CONSTRAINT movimiento_brigada_ruta_id_fkey FOREIGN KEY (ruta_id) REFERENCES public.ruta(id) ON DELETE SET NULL;


--
-- Name: movimiento_brigada movimiento_brigada_turno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimiento_brigada
    ADD CONSTRAINT movimiento_brigada_turno_id_fkey FOREIGN KEY (turno_id) REFERENCES public.turno(id) ON DELETE CASCADE;


--
-- Name: movimiento_brigada movimiento_brigada_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimiento_brigada
    ADD CONSTRAINT movimiento_brigada_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE RESTRICT;


--
-- Name: municipio municipio_departamento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.municipio
    ADD CONSTRAINT municipio_departamento_id_fkey FOREIGN KEY (departamento_id) REFERENCES public.departamento(id) ON DELETE RESTRICT;


--
-- Name: notificacion notificacion_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificacion
    ADD CONSTRAINT notificacion_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE SET NULL;


--
-- Name: password_reset_log password_reset_log_habilitado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_log
    ADD CONSTRAINT password_reset_log_habilitado_por_fkey FOREIGN KEY (habilitado_por) REFERENCES public.usuario(id);


--
-- Name: password_reset_log password_reset_log_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_log
    ADD CONSTRAINT password_reset_log_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id);


--
-- Name: persona_accidente persona_accidente_situacion_vehiculo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persona_accidente
    ADD CONSTRAINT persona_accidente_situacion_vehiculo_id_fkey FOREIGN KEY (situacion_vehiculo_id) REFERENCES public.situacion_vehiculo(id) ON DELETE CASCADE;


--
-- Name: persona_accidente persona_accidente_vehiculo_accidente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persona_accidente
    ADD CONSTRAINT persona_accidente_vehiculo_accidente_id_fkey FOREIGN KEY (vehiculo_accidente_id) REFERENCES public.vehiculo_accidente(id);


--
-- Name: plantilla_comunicacion plantilla_comunicacion_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plantilla_comunicacion
    ADD CONSTRAINT plantilla_comunicacion_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuario(id);


--
-- Name: plantilla_inspeccion_360 plantilla_inspeccion_360_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plantilla_inspeccion_360
    ADD CONSTRAINT plantilla_inspeccion_360_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuario(id) ON DELETE SET NULL;


--
-- Name: publicacion_social publicacion_social_plantilla_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publicacion_social
    ADD CONSTRAINT publicacion_social_plantilla_id_fkey FOREIGN KEY (plantilla_id) REFERENCES public.plantilla_comunicacion(id);


--
-- Name: publicacion_social publicacion_social_publicado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publicacion_social
    ADD CONSTRAINT publicacion_social_publicado_por_fkey FOREIGN KEY (publicado_por) REFERENCES public.usuario(id);


--
-- Name: publicacion_social publicacion_social_situacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publicacion_social
    ADD CONSTRAINT publicacion_social_situacion_id_fkey FOREIGN KEY (situacion_id) REFERENCES public.situacion(id);


--
-- Name: punto_mapa punto_mapa_capa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.punto_mapa
    ADD CONSTRAINT punto_mapa_capa_id_fkey FOREIGN KEY (capa_id) REFERENCES public.capa_mapa(id) ON DELETE CASCADE;


--
-- Name: punto_mapa punto_mapa_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.punto_mapa
    ADD CONSTRAINT punto_mapa_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.usuario(id);


--
-- Name: reasignacion_sede reasignacion_sede_autorizado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reasignacion_sede
    ADD CONSTRAINT reasignacion_sede_autorizado_por_fkey FOREIGN KEY (autorizado_por) REFERENCES public.usuario(id) ON DELETE RESTRICT;


--
-- Name: reasignacion_sede reasignacion_sede_sede_destino_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reasignacion_sede
    ADD CONSTRAINT reasignacion_sede_sede_destino_id_fkey FOREIGN KEY (sede_destino_id) REFERENCES public.sede(id) ON DELETE RESTRICT;


--
-- Name: reasignacion_sede reasignacion_sede_sede_origen_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reasignacion_sede
    ADD CONSTRAINT reasignacion_sede_sede_origen_id_fkey FOREIGN KEY (sede_origen_id) REFERENCES public.sede(id) ON DELETE RESTRICT;


--
-- Name: registro_cambio registro_cambio_asignacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registro_cambio
    ADD CONSTRAINT registro_cambio_asignacion_id_fkey FOREIGN KEY (asignacion_id) REFERENCES public.asignacion_unidad(id) ON DELETE SET NULL;


--
-- Name: registro_cambio registro_cambio_autorizado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registro_cambio
    ADD CONSTRAINT registro_cambio_autorizado_por_fkey FOREIGN KEY (autorizado_por) REFERENCES public.usuario(id) ON DELETE SET NULL;


--
-- Name: registro_cambio registro_cambio_realizado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registro_cambio
    ADD CONSTRAINT registro_cambio_realizado_por_fkey FOREIGN KEY (realizado_por) REFERENCES public.usuario(id) ON DELETE RESTRICT;


--
-- Name: registro_cambio registro_cambio_situacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registro_cambio
    ADD CONSTRAINT registro_cambio_situacion_id_fkey FOREIGN KEY (situacion_id) REFERENCES public.situacion(id) ON DELETE SET NULL;


--
-- Name: registro_cambio registro_cambio_unidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registro_cambio
    ADD CONSTRAINT registro_cambio_unidad_id_fkey FOREIGN KEY (unidad_id) REFERENCES public.unidad(id) ON DELETE SET NULL;


--
-- Name: registro_cambio registro_cambio_usuario_afectado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registro_cambio
    ADD CONSTRAINT registro_cambio_usuario_afectado_id_fkey FOREIGN KEY (usuario_afectado_id) REFERENCES public.usuario(id) ON DELETE SET NULL;


--
-- Name: relevo relevo_registrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relevo
    ADD CONSTRAINT relevo_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES public.usuario(id) ON DELETE RESTRICT;


--
-- Name: relevo relevo_situacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relevo
    ADD CONSTRAINT relevo_situacion_id_fkey FOREIGN KEY (situacion_id) REFERENCES public.situacion(id) ON DELETE CASCADE;


--
-- Name: relevo relevo_unidad_entrante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relevo
    ADD CONSTRAINT relevo_unidad_entrante_id_fkey FOREIGN KEY (unidad_entrante_id) REFERENCES public.unidad(id) ON DELETE RESTRICT;


--
-- Name: relevo relevo_unidad_saliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relevo
    ADD CONSTRAINT relevo_unidad_saliente_id_fkey FOREIGN KEY (unidad_saliente_id) REFERENCES public.unidad(id) ON DELETE RESTRICT;


--
-- Name: reporte_horario reporte_horario_asignacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reporte_horario
    ADD CONSTRAINT reporte_horario_asignacion_id_fkey FOREIGN KEY (asignacion_id) REFERENCES public.asignacion_unidad(id) ON DELETE CASCADE;


--
-- Name: reporte_horario reporte_horario_reportado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reporte_horario
    ADD CONSTRAINT reporte_horario_reportado_por_fkey FOREIGN KEY (reportado_por) REFERENCES public.usuario(id) ON DELETE RESTRICT;


--
-- Name: rol_permiso rol_permiso_permiso_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rol_permiso
    ADD CONSTRAINT rol_permiso_permiso_id_fkey FOREIGN KEY (permiso_id) REFERENCES public.permiso(id) ON DELETE CASCADE;


--
-- Name: rol_permiso rol_permiso_rol_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rol_permiso
    ADD CONSTRAINT rol_permiso_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES public.rol(id) ON DELETE CASCADE;


--
-- Name: salida_unidad salida_unidad_finalizada_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salida_unidad
    ADD CONSTRAINT salida_unidad_finalizada_por_fkey FOREIGN KEY (finalizada_por) REFERENCES public.usuario(id) ON DELETE SET NULL;


--
-- Name: salida_unidad salida_unidad_inspeccion_360_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salida_unidad
    ADD CONSTRAINT salida_unidad_inspeccion_360_id_fkey FOREIGN KEY (inspeccion_360_id) REFERENCES public.inspeccion_360(id) ON DELETE SET NULL;


--
-- Name: salida_unidad salida_unidad_ruta_inicial_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salida_unidad
    ADD CONSTRAINT salida_unidad_ruta_inicial_id_fkey FOREIGN KEY (ruta_inicial_id) REFERENCES public.ruta(id) ON DELETE SET NULL;


--
-- Name: salida_unidad salida_unidad_sede_origen_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salida_unidad
    ADD CONSTRAINT salida_unidad_sede_origen_id_fkey FOREIGN KEY (sede_origen_id) REFERENCES public.sede(id) ON DELETE RESTRICT;


--
-- Name: salida_unidad salida_unidad_unidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salida_unidad
    ADD CONSTRAINT salida_unidad_unidad_id_fkey FOREIGN KEY (unidad_id) REFERENCES public.unidad(id) ON DELETE RESTRICT;


--
-- Name: sancion sancion_aplicada_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sancion
    ADD CONSTRAINT sancion_aplicada_por_fkey FOREIGN KEY (aplicada_por) REFERENCES public.usuario(id) ON DELETE SET NULL;


--
-- Name: sancion sancion_articulo_sancion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sancion
    ADD CONSTRAINT sancion_articulo_sancion_id_fkey FOREIGN KEY (articulo_sancion_id) REFERENCES public.articulo_sancion(id) ON DELETE SET NULL;


--
-- Name: sancion sancion_piloto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sancion
    ADD CONSTRAINT sancion_piloto_id_fkey FOREIGN KEY (piloto_id) REFERENCES public.piloto(id) ON DELETE SET NULL;


--
-- Name: sancion sancion_vehiculo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sancion
    ADD CONSTRAINT sancion_vehiculo_id_fkey FOREIGN KEY (vehiculo_id) REFERENCES public.vehiculo(id) ON DELETE CASCADE;


--
-- Name: sede sede_departamento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sede
    ADD CONSTRAINT sede_departamento_id_fkey FOREIGN KEY (departamento_id) REFERENCES public.departamento(id) ON DELETE SET NULL;


--
-- Name: sede sede_municipio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sede
    ADD CONSTRAINT sede_municipio_id_fkey FOREIGN KEY (municipio_id) REFERENCES public.municipio(id) ON DELETE SET NULL;


--
-- Name: situacion_actual situacion_actual_actividad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion_actual
    ADD CONSTRAINT situacion_actual_actividad_id_fkey FOREIGN KEY (actividad_id) REFERENCES public.actividad(id) ON DELETE SET NULL;


--
-- Name: situacion_actual situacion_actual_ruta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion_actual
    ADD CONSTRAINT situacion_actual_ruta_id_fkey FOREIGN KEY (ruta_id) REFERENCES public.ruta(id);


--
-- Name: situacion_actual situacion_actual_situacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion_actual
    ADD CONSTRAINT situacion_actual_situacion_id_fkey FOREIGN KEY (situacion_id) REFERENCES public.situacion(id) ON DELETE SET NULL;


--
-- Name: situacion_actual situacion_actual_unidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion_actual
    ADD CONSTRAINT situacion_actual_unidad_id_fkey FOREIGN KEY (unidad_id) REFERENCES public.unidad(id) ON DELETE CASCADE;


--
-- Name: situacion situacion_actualizado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion
    ADD CONSTRAINT situacion_actualizado_por_fkey FOREIGN KEY (actualizado_por) REFERENCES public.usuario(id) ON DELETE SET NULL;


--
-- Name: situacion situacion_asignacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion
    ADD CONSTRAINT situacion_asignacion_id_fkey FOREIGN KEY (asignacion_id) REFERENCES public.asignacion_unidad(id) ON DELETE CASCADE;


--
-- Name: situacion_causa situacion_causa_causa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion_causa
    ADD CONSTRAINT situacion_causa_causa_id_fkey FOREIGN KEY (causa_id) REFERENCES public.causa_hecho_transito(id);


--
-- Name: situacion_causa situacion_causa_situacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion_causa
    ADD CONSTRAINT situacion_causa_situacion_id_fkey FOREIGN KEY (situacion_id) REFERENCES public.situacion(id) ON DELETE CASCADE;


--
-- Name: situacion_conflicto situacion_conflicto_resuelto_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion_conflicto
    ADD CONSTRAINT situacion_conflicto_resuelto_por_fkey FOREIGN KEY (resuelto_por) REFERENCES public.usuario(id);


--
-- Name: situacion_conflicto situacion_conflicto_situacion_existente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion_conflicto
    ADD CONSTRAINT situacion_conflicto_situacion_existente_id_fkey FOREIGN KEY (situacion_existente_id) REFERENCES public.situacion(id);


--
-- Name: situacion_conflicto situacion_conflicto_usuario_reporta_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion_conflicto
    ADD CONSTRAINT situacion_conflicto_usuario_reporta_fkey FOREIGN KEY (usuario_reporta) REFERENCES public.usuario(id);


--
-- Name: situacion situacion_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion
    ADD CONSTRAINT situacion_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuario(id) ON DELETE RESTRICT;


--
-- Name: situacion situacion_departamento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion
    ADD CONSTRAINT situacion_departamento_id_fkey FOREIGN KEY (departamento_id) REFERENCES public.departamento(id) ON DELETE SET NULL;


--
-- Name: situacion_draft situacion_draft_situacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion_draft
    ADD CONSTRAINT situacion_draft_situacion_id_fkey FOREIGN KEY (situacion_id) REFERENCES public.situacion(id);


--
-- Name: situacion_draft situacion_draft_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion_draft
    ADD CONSTRAINT situacion_draft_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id);


--
-- Name: situacion_multimedia situacion_multimedia_situacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion_multimedia
    ADD CONSTRAINT situacion_multimedia_situacion_id_fkey FOREIGN KEY (situacion_id) REFERENCES public.situacion(id) ON DELETE CASCADE;


--
-- Name: situacion_multimedia situacion_multimedia_subido_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion_multimedia
    ADD CONSTRAINT situacion_multimedia_subido_por_fkey FOREIGN KEY (subido_por) REFERENCES public.usuario(id);


--
-- Name: situacion situacion_municipio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion
    ADD CONSTRAINT situacion_municipio_id_fkey FOREIGN KEY (municipio_id) REFERENCES public.municipio(id) ON DELETE SET NULL;


--
-- Name: situacion situacion_ruta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion
    ADD CONSTRAINT situacion_ruta_id_fkey FOREIGN KEY (ruta_id) REFERENCES public.ruta(id) ON DELETE SET NULL;


--
-- Name: situacion situacion_salida_unidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion
    ADD CONSTRAINT situacion_salida_unidad_id_fkey FOREIGN KEY (salida_unidad_id) REFERENCES public.salida_unidad(id) ON DELETE SET NULL;


--
-- Name: situacion_sesion situacion_sesion_situacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion_sesion
    ADD CONSTRAINT situacion_sesion_situacion_id_fkey FOREIGN KEY (situacion_id) REFERENCES public.situacion(id) ON DELETE CASCADE;


--
-- Name: situacion_sesion situacion_sesion_unidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion_sesion
    ADD CONSTRAINT situacion_sesion_unidad_id_fkey FOREIGN KEY (unidad_id) REFERENCES public.unidad(id);


--
-- Name: situacion_sesion situacion_sesion_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion_sesion
    ADD CONSTRAINT situacion_sesion_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id);


--
-- Name: situacion situacion_tipo_situacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion
    ADD CONSTRAINT situacion_tipo_situacion_id_fkey FOREIGN KEY (tipo_situacion_id) REFERENCES public.catalogo_tipo_situacion(id);


--
-- Name: situacion situacion_turno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion
    ADD CONSTRAINT situacion_turno_id_fkey FOREIGN KEY (turno_id) REFERENCES public.turno(id) ON DELETE CASCADE;


--
-- Name: situacion situacion_unidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion
    ADD CONSTRAINT situacion_unidad_id_fkey FOREIGN KEY (unidad_id) REFERENCES public.unidad(id) ON DELETE RESTRICT;


--
-- Name: situacion_vehiculo_dispositivo situacion_vehiculo_dispositivo_dispositivo_seguridad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion_vehiculo_dispositivo
    ADD CONSTRAINT situacion_vehiculo_dispositivo_dispositivo_seguridad_id_fkey FOREIGN KEY (dispositivo_seguridad_id) REFERENCES public.dispositivo_seguridad(id);


--
-- Name: situacion_vehiculo_dispositivo situacion_vehiculo_dispositivo_situacion_vehiculo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion_vehiculo_dispositivo
    ADD CONSTRAINT situacion_vehiculo_dispositivo_situacion_vehiculo_id_fkey FOREIGN KEY (situacion_vehiculo_id) REFERENCES public.situacion_vehiculo(id) ON DELETE CASCADE;


--
-- Name: situacion_vehiculo situacion_vehiculo_piloto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion_vehiculo
    ADD CONSTRAINT situacion_vehiculo_piloto_id_fkey FOREIGN KEY (piloto_id) REFERENCES public.piloto(id);


--
-- Name: situacion_vehiculo situacion_vehiculo_situacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion_vehiculo
    ADD CONSTRAINT situacion_vehiculo_situacion_id_fkey FOREIGN KEY (situacion_id) REFERENCES public.situacion(id) ON DELETE CASCADE;


--
-- Name: situacion_vehiculo situacion_vehiculo_vehiculo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.situacion_vehiculo
    ADD CONSTRAINT situacion_vehiculo_vehiculo_id_fkey FOREIGN KEY (vehiculo_id) REFERENCES public.vehiculo(id);


--
-- Name: suscripcion_alerta suscripcion_alerta_solo_sede_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suscripcion_alerta
    ADD CONSTRAINT suscripcion_alerta_solo_sede_id_fkey FOREIGN KEY (solo_sede_id) REFERENCES public.sede(id);


--
-- Name: suscripcion_alerta suscripcion_alerta_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suscripcion_alerta
    ADD CONSTRAINT suscripcion_alerta_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id);


--
-- Name: tarjeta_circulacion tarjeta_circulacion_vehiculo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tarjeta_circulacion
    ADD CONSTRAINT tarjeta_circulacion_vehiculo_id_fkey FOREIGN KEY (vehiculo_id) REFERENCES public.vehiculo(id) ON DELETE CASCADE;


--
-- Name: tripulacion_turno tripulacion_turno_asignacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tripulacion_turno
    ADD CONSTRAINT tripulacion_turno_asignacion_id_fkey FOREIGN KEY (asignacion_id) REFERENCES public.asignacion_unidad(id) ON DELETE CASCADE;


--
-- Name: tripulacion_turno tripulacion_turno_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tripulacion_turno
    ADD CONSTRAINT tripulacion_turno_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE RESTRICT;


--
-- Name: turno turno_aprobado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turno
    ADD CONSTRAINT turno_aprobado_por_fkey FOREIGN KEY (aprobado_por) REFERENCES public.usuario(id) ON DELETE SET NULL;


--
-- Name: turno turno_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turno
    ADD CONSTRAINT turno_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuario(id) ON DELETE RESTRICT;


--
-- Name: turno turno_publicado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turno
    ADD CONSTRAINT turno_publicado_por_fkey FOREIGN KEY (publicado_por) REFERENCES public.usuario(id);


--
-- Name: turno turno_sede_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turno
    ADD CONSTRAINT turno_sede_id_fkey FOREIGN KEY (sede_id) REFERENCES public.sede(id);


--
-- Name: ubicacion_brigada ubicacion_brigada_asignacion_actual_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ubicacion_brigada
    ADD CONSTRAINT ubicacion_brigada_asignacion_actual_id_fkey FOREIGN KEY (asignacion_actual_id) REFERENCES public.asignacion_unidad(id);


--
-- Name: ubicacion_brigada ubicacion_brigada_asignacion_origen_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ubicacion_brigada
    ADD CONSTRAINT ubicacion_brigada_asignacion_origen_id_fkey FOREIGN KEY (asignacion_origen_id) REFERENCES public.asignacion_unidad(id);


--
-- Name: ubicacion_brigada ubicacion_brigada_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ubicacion_brigada
    ADD CONSTRAINT ubicacion_brigada_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuario(id);


--
-- Name: ubicacion_brigada ubicacion_brigada_punto_fijo_ruta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ubicacion_brigada
    ADD CONSTRAINT ubicacion_brigada_punto_fijo_ruta_id_fkey FOREIGN KEY (punto_fijo_ruta_id) REFERENCES public.ruta(id);


--
-- Name: ubicacion_brigada ubicacion_brigada_unidad_actual_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ubicacion_brigada
    ADD CONSTRAINT ubicacion_brigada_unidad_actual_id_fkey FOREIGN KEY (unidad_actual_id) REFERENCES public.unidad(id);


--
-- Name: ubicacion_brigada ubicacion_brigada_unidad_origen_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ubicacion_brigada
    ADD CONSTRAINT ubicacion_brigada_unidad_origen_id_fkey FOREIGN KEY (unidad_origen_id) REFERENCES public.unidad(id);


--
-- Name: ubicacion_brigada ubicacion_brigada_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ubicacion_brigada
    ADD CONSTRAINT ubicacion_brigada_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id);


--
-- Name: unidad_reparacion unidad_reparacion_registrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidad_reparacion
    ADD CONSTRAINT unidad_reparacion_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES public.usuario(id);


--
-- Name: unidad_reparacion unidad_reparacion_unidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidad_reparacion
    ADD CONSTRAINT unidad_reparacion_unidad_id_fkey FOREIGN KEY (unidad_id) REFERENCES public.unidad(id) ON DELETE CASCADE;


--
-- Name: unidad unidad_sede_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidad
    ADD CONSTRAINT unidad_sede_id_fkey FOREIGN KEY (sede_id) REFERENCES public.sede(id) ON DELETE RESTRICT;


--
-- Name: usuario_inactividad usuario_inactividad_motivo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_inactividad
    ADD CONSTRAINT usuario_inactividad_motivo_id_fkey FOREIGN KEY (motivo_id) REFERENCES public.catalogo_motivo_inactividad(id);


--
-- Name: usuario_inactividad usuario_inactividad_reactivado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_inactividad
    ADD CONSTRAINT usuario_inactividad_reactivado_por_fkey FOREIGN KEY (reactivado_por) REFERENCES public.usuario(id);


--
-- Name: usuario_inactividad usuario_inactividad_registrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_inactividad
    ADD CONSTRAINT usuario_inactividad_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES public.usuario(id);


--
-- Name: usuario_inactividad usuario_inactividad_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_inactividad
    ADD CONSTRAINT usuario_inactividad_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE CASCADE;


--
-- Name: usuario usuario_password_reset_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_password_reset_by_fkey FOREIGN KEY (password_reset_by) REFERENCES public.usuario(id);


--
-- Name: usuario_rol usuario_rol_asignado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_rol
    ADD CONSTRAINT usuario_rol_asignado_por_fkey FOREIGN KEY (asignado_por) REFERENCES public.usuario(id);


--
-- Name: usuario usuario_rol_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES public.rol(id) ON DELETE RESTRICT;


--
-- Name: usuario_rol usuario_rol_rol_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_rol
    ADD CONSTRAINT usuario_rol_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES public.rol(id) ON DELETE CASCADE;


--
-- Name: usuario_rol usuario_rol_sede_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_rol
    ADD CONSTRAINT usuario_rol_sede_id_fkey FOREIGN KEY (sede_id) REFERENCES public.sede(id);


--
-- Name: usuario_rol usuario_rol_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_rol
    ADD CONSTRAINT usuario_rol_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE CASCADE;


--
-- Name: usuario usuario_sede_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_sede_id_fkey FOREIGN KEY (sede_id) REFERENCES public.sede(id) ON DELETE SET NULL;


--
-- Name: usuario usuario_sub_rol_cop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_sub_rol_cop_id_fkey FOREIGN KEY (sub_rol_cop_id) REFERENCES public.sub_rol_cop(id);


--
-- Name: vehiculo_aseguradora vehiculo_ajustador_aseguradora_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehiculo_aseguradora
    ADD CONSTRAINT vehiculo_ajustador_aseguradora_id_fkey FOREIGN KEY (aseguradora_id) REFERENCES public.aseguradora(id);


--
-- Name: vehiculo_aseguradora vehiculo_ajustador_situacion_vehiculo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehiculo_aseguradora
    ADD CONSTRAINT vehiculo_ajustador_situacion_vehiculo_id_fkey FOREIGN KEY (situacion_vehiculo_id) REFERENCES public.situacion_vehiculo(id) ON DELETE CASCADE;


--
-- Name: vehiculo_grua vehiculo_grua_grua_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehiculo_grua
    ADD CONSTRAINT vehiculo_grua_grua_id_fkey FOREIGN KEY (grua_id) REFERENCES public.grua(id);


--
-- Name: vehiculo_grua vehiculo_grua_situacion_vehiculo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehiculo_grua
    ADD CONSTRAINT vehiculo_grua_situacion_vehiculo_id_fkey FOREIGN KEY (situacion_vehiculo_id) REFERENCES public.situacion_vehiculo(id) ON DELETE CASCADE;


--
-- Name: vehiculo vehiculo_marca_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehiculo
    ADD CONSTRAINT vehiculo_marca_id_fkey FOREIGN KEY (marca_id) REFERENCES public.marca_vehiculo(id) ON DELETE SET NULL;


--
-- Name: vehiculo vehiculo_tipo_vehiculo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehiculo
    ADD CONSTRAINT vehiculo_tipo_vehiculo_id_fkey FOREIGN KEY (tipo_vehiculo_id) REFERENCES public.tipo_vehiculo(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict qhoa7PiQaufsOvauiT8SwwsiG5VGqDGFRuBFwDGMBTZoLTVQUzYqYmxkMJ6PrsB

