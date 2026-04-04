-- Fix trigger fn_actualizar_situacion_actual_actividad:
-- Ahora también actualiza km, sentido, ruta_id, ruta_codigo en situacion_actual

CREATE OR REPLACE FUNCTION public.fn_actualizar_situacion_actual_actividad()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_nombre_actividad TEXT;
    v_icono TEXT;
    v_ruta_codigo TEXT;
BEGIN
    SELECT nombre, icono INTO v_nombre_actividad, v_icono
    FROM catalogo_tipo_situacion
    WHERE id = NEW.tipo_actividad_id;

    IF NEW.ruta_id IS NOT NULL THEN
        SELECT codigo INTO v_ruta_codigo FROM ruta WHERE id = NEW.ruta_id;
    END IF;

    UPDATE situacion_actual
    SET
        situacion_id = NULL,
        tipo_situacion = NULL,
        actividad_id = NEW.id,
        actividad_tipo_nombre = v_nombre_actividad,
        icono = v_icono,
        actividad_estado = NEW.estado,
        actividad_created_at = NEW.created_at,
        estado = NEW.estado,
        km = NEW.km,
        sentido = NEW.sentido,
        ruta_id = NEW.ruta_id,
        ruta_codigo = v_ruta_codigo,
        latitud = NEW.latitud,
        longitud = NEW.longitud,
        updated_at = NOW()
    WHERE unidad_id = NEW.unidad_id;

    IF NOT FOUND THEN
        INSERT INTO situacion_actual (
            unidad_id, icono, actividad_id, actividad_tipo_nombre,
            actividad_estado, actividad_created_at, estado,
            km, sentido, ruta_id, ruta_codigo, latitud, longitud, updated_at
        ) VALUES (
            NEW.unidad_id, v_icono, NEW.id, v_nombre_actividad,
            NEW.estado, NEW.created_at, NEW.estado,
            NEW.km, NEW.sentido, NEW.ruta_id, v_ruta_codigo,
            NEW.latitud, NEW.longitud, NOW()
        );
    END IF;

    RETURN NEW;
END;
$function$;

-- Fix rows that were already in situacion_actual with stale km from old trigger
UPDATE situacion_actual sa
SET
    km = a.km,
    sentido = a.sentido,
    ruta_id = a.ruta_id,
    ruta_codigo = r.codigo,
    actividad_estado = a.estado,
    actividad_created_at = a.created_at
FROM actividad a
LEFT JOIN ruta r ON a.ruta_id = r.id
WHERE sa.actividad_id = a.id
  AND sa.situacion_id IS NULL;
