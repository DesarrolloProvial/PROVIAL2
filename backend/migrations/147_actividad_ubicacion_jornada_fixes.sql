-- Migration 147: actividad ubicación + jornada fixes
-- 1. Agrega departamento_id / municipio_id a actividad
-- 2. Mejora trigger fn_actualizar_situacion_actual_actividad → INSERT … ON CONFLICT DO UPDATE
-- 3. Actualiza iniciar_salida_unidad → DELETE situacion_actual en lugar de UPDATE NULL
-- 4. Actualiza fn_cerrar_salida_cop (si existe) → mismo cambio

-- ── 1. Columnas de ubicación en actividad ─────────────────────────────────────
ALTER TABLE actividad
  ADD COLUMN IF NOT EXISTS departamento_id INTEGER REFERENCES departamento(id),
  ADD COLUMN IF NOT EXISTS municipio_id    INTEGER REFERENCES municipio(id);

-- ── 2. Trigger UPSERT atómico en situacion_actual ────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_actualizar_situacion_actual_actividad()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_nombre_actividad TEXT;
    v_icono            TEXT;
    v_ruta_codigo      TEXT;
BEGIN
    SELECT nombre, icono INTO v_nombre_actividad, v_icono
    FROM catalogo_tipo_situacion
    WHERE id = NEW.tipo_actividad_id;

    IF NEW.ruta_id IS NOT NULL THEN
        SELECT codigo INTO v_ruta_codigo FROM ruta WHERE id = NEW.ruta_id;
    END IF;

    INSERT INTO situacion_actual (
        unidad_id,
        situacion_id,   tipo_situacion,
        actividad_id,   actividad_tipo_nombre, actividad_estado, actividad_created_at,
        icono, estado,
        km, sentido, ruta_id, ruta_codigo,
        latitud, longitud, updated_at
    ) VALUES (
        NEW.unidad_id,
        NULL, NULL,
        NEW.id, v_nombre_actividad, NEW.estado, NEW.created_at,
        v_icono, NEW.estado,
        NEW.km, NEW.sentido, NEW.ruta_id, v_ruta_codigo,
        NEW.latitud, NEW.longitud, NOW()
    )
    ON CONFLICT (unidad_id) DO UPDATE SET
        situacion_id          = NULL,
        tipo_situacion        = NULL,
        actividad_id          = NEW.id,
        actividad_tipo_nombre = v_nombre_actividad,
        actividad_estado      = NEW.estado,
        actividad_created_at  = NEW.created_at,
        icono                 = v_icono,
        estado                = NEW.estado,
        km                    = NEW.km,
        sentido               = NEW.sentido,
        ruta_id               = NEW.ruta_id,
        ruta_codigo           = v_ruta_codigo,
        latitud               = NEW.latitud,
        longitud              = NEW.longitud,
        updated_at            = NOW();

    RETURN NEW;
END;
$function$;

-- ── 3. iniciar_salida_unidad → DELETE en lugar de UPDATE NULL ─────────────────
CREATE OR REPLACE FUNCTION iniciar_salida_unidad(
    p_unidad_id          INT,
    p_ruta_inicial_id    INT,
    p_km_inicial         NUMERIC,
    p_combustible_inicial NUMERIC,
    p_observaciones      TEXT
) RETURNS INT AS $$
DECLARE
    v_salida_id        INT;
    v_tripulacion      JSONB;
    v_salida_existente INT;
BEGIN
    SELECT id INTO v_salida_existente FROM salida_unidad
    WHERE unidad_id = p_unidad_id AND estado = 'EN_SALIDA';

    IF v_salida_existente IS NOT NULL THEN
        RAISE EXCEPTION 'La unidad ya tiene una salida activa (ID: %)', v_salida_existente;
    END IF;

    SELECT json_agg(
        json_build_object(
            'brigada_id', u.id,
            'chapa',      u.chapa,
            'nombre',     u.nombre_completo,
            'rol',        tt.rol_tripulacion
        )
        ORDER BY CASE tt.rol_tripulacion
            WHEN 'PILOTO' THEN 1 WHEN 'COPILOTO' THEN 2 WHEN 'ACOMPANANTE' THEN 3 ELSE 4
        END
    )
    INTO v_tripulacion
    FROM tripulacion_turno tt
    JOIN asignacion_unidad au ON tt.asignacion_id = au.id
    JOIN turno t              ON au.turno_id = t.id
    JOIN usuario u            ON tt.usuario_id = u.id
    WHERE au.unidad_id = p_unidad_id
      AND t.fecha = CURRENT_DATE
      AND t.estado IN ('ACTIVO', 'PLANIFICADO');

    INSERT INTO salida_unidad (
        unidad_id, ruta_inicial_id, km_inicial, combustible_inicial,
        observaciones_salida, tripulacion
    ) VALUES (
        p_unidad_id, p_ruta_inicial_id, p_km_inicial, p_combustible_inicial,
        p_observaciones, v_tripulacion
    ) RETURNING id INTO v_salida_id;

    UPDATE unidad SET updated_at = NOW() WHERE id = p_unidad_id;

    -- Eliminar fila de situacion_actual al iniciar nueva salida.
    -- El trigger la recreará cuando se registre la primera situación/actividad.
    DELETE FROM situacion_actual WHERE unidad_id = p_unidad_id;

    RETURN v_salida_id;
END;
$$ LANGUAGE plpgsql;
