-- Migración 141: función validar_disponibilidad_brigada
-- Usada por GET /api/operaciones/brigadas/disponibles?fecha=YYYY-MM-DD
-- Devuelve una fila con (disponible, mensaje, dias_descanso) por brigada/fecha.

CREATE OR REPLACE FUNCTION validar_disponibilidad_brigada(
    p_usuario_id integer,
    p_fecha      date
)
RETURNS TABLE (
    disponible    boolean,
    mensaje       text,
    dias_descanso integer
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_ya_asignado  boolean;
    v_inactivo     boolean;
    v_motivo_nom   text;
    v_ultimo_turno date;
    v_dias         integer;
BEGIN
    -- 1. ¿Está inactivo hoy?
    SELECT (m.motivo_codigo IS NOT NULL), m.motivo_nombre
    INTO   v_inactivo, v_motivo_nom
    FROM   (SELECT motivo_codigo, motivo_nombre
            FROM   get_motivo_inactividad_actual(p_usuario_id)
            LIMIT  1) m
    RIGHT JOIN (SELECT 1) dummy ON true;

    v_inactivo := COALESCE(v_inactivo, false);

    IF v_inactivo THEN
        RETURN QUERY SELECT false, ('Inactivo: ' || v_motivo_nom)::text, 0;
        RETURN;
    END IF;

    -- 2. ¿Ya está asignado en esa fecha?
    SELECT EXISTS (
        SELECT 1
        FROM   tripulacion_turno tt
        JOIN   asignacion_unidad au ON tt.asignacion_id = au.id
        JOIN   turno t              ON au.turno_id       = t.id
        WHERE  tt.usuario_id = p_usuario_id
          AND  t.fecha       = p_fecha
          AND  t.estado IN ('PLANIFICADO', 'ACTIVO')
    ) INTO v_ya_asignado;

    IF v_ya_asignado THEN
        RETURN QUERY SELECT false, 'Ya asignado en esta fecha'::text, 0;
        RETURN;
    END IF;

    -- 3. Días desde último turno (para ordenamiento; NULL → 999)
    SELECT MAX(t.fecha)
    INTO   v_ultimo_turno
    FROM   tripulacion_turno tt
    JOIN   asignacion_unidad au ON tt.asignacion_id = au.id
    JOIN   turno t              ON au.turno_id       = t.id
    WHERE  tt.usuario_id = p_usuario_id
      AND  t.fecha < p_fecha;

    v_dias := COALESCE((p_fecha - v_ultimo_turno), 999);

    RETURN QUERY SELECT true, 'Disponible'::text, v_dias;
END;
$$;
