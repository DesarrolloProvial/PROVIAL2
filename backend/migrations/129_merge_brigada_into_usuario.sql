-- Migration 129: Merge brigada table into usuario
-- brigada es un rol, no una tabla separada. Los datos de brigada viven ahora en usuario.

-- ============================================================
-- PASO 1: Añadir columnas de brigada a usuario
-- ============================================================
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS licencia_tipo VARCHAR(5);
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS licencia_numero VARCHAR(30);
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS licencia_vencimiento DATE;
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS direccion TEXT;
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS contacto_emergencia VARCHAR(150);
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS telefono_emergencia VARCHAR(20);

-- ============================================================
-- PASO 2: Migrar datos de brigada → usuario
-- ============================================================
UPDATE usuario u SET
  fecha_nacimiento     = b.fecha_nacimiento,
  licencia_tipo        = b.licencia_tipo,
  licencia_numero      = b.licencia_numero,
  licencia_vencimiento = b.licencia_vencimiento,
  direccion            = b.direccion,
  contacto_emergencia  = b.contacto_emergencia,
  telefono_emergencia  = b.telefono_emergencia
FROM brigada b
WHERE b.usuario_id = u.id;

-- ============================================================
-- PASO 3: Reapuntar alerta.brigada_id de brigada.id → usuario.id
-- alerta tiene 0 filas, así que no hay datos que migrar.
-- ============================================================
ALTER TABLE alerta DROP CONSTRAINT IF EXISTS alerta_brigada_id_fkey;
ALTER TABLE alerta ADD CONSTRAINT alerta_brigada_id_fkey
  FOREIGN KEY (brigada_id) REFERENCES usuario(id);

-- ============================================================
-- PASO 4: Eliminar vistas dependientes de brigada
-- ============================================================
DROP VIEW IF EXISTS v_alertas_activas;
DROP VIEW IF EXISTS v_mis_alertas_no_leidas;
DROP VIEW IF EXISTS v_brigada;

-- ============================================================
-- PASO 5: Eliminar funciones que usan brigada directamente
-- ============================================================
DROP FUNCTION IF EXISTS fn_brigada_to_usuario(integer);

-- ============================================================
-- PASO 6: Reparar funciones que usan brigada_unidad (ya eliminada)
-- ============================================================

-- 6a. obtener_comandante_unidad — eliminar rama PERMANENTE (brigada_unidad ya no existe)
CREATE OR REPLACE FUNCTION public.obtener_comandante_unidad(p_unidad_id integer)
RETURNS TABLE(usuario_id integer, nombre_completo character varying, chapa character varying, tipo_asignacion character varying)
LANGUAGE plpgsql AS $$
BEGIN
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

-- 6b. aprobar_inspeccion_360 — eliminar rama brigada_unidad del chequeo de comandante
CREATE OR REPLACE FUNCTION public.aprobar_inspeccion_360(
    p_inspeccion_id integer,
    p_aprobador_id integer,
    p_firma text DEFAULT NULL,
    p_observaciones text DEFAULT NULL
)
RETURNS TABLE(success boolean, mensaje text)
LANGUAGE plpgsql AS $$
DECLARE
    v_inspeccion RECORD;
    v_es_comandante BOOLEAN;
BEGIN
    SELECT * INTO v_inspeccion FROM inspeccion_360 WHERE id = p_inspeccion_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Inspección no encontrada'::TEXT; RETURN;
    END IF;
    IF v_inspeccion.estado != 'PENDIENTE' THEN
        RETURN QUERY SELECT FALSE, ('La inspección ya fue ' || v_inspeccion.estado)::TEXT; RETURN;
    END IF;

    -- Verificar que el aprobador sea comandante por turno activo
    SELECT EXISTS (
        SELECT 1 FROM tripulacion_turno tt
        JOIN asignacion_unidad au ON tt.asignacion_id = au.id
        WHERE tt.usuario_id = p_aprobador_id
          AND au.unidad_id = v_inspeccion.unidad_id
          AND tt.es_comandante = TRUE
    ) INTO v_es_comandante;

    -- Admin/COP puede aprobar sin ser comandante
    IF NOT v_es_comandante THEN
        SELECT EXISTS (
            SELECT 1 FROM usuario u JOIN rol r ON u.rol_id = r.id
            WHERE u.id = p_aprobador_id AND r.nombre IN ('ADMIN','COP','OPERACIONES')
        ) INTO v_es_comandante;
    END IF;

    IF NOT v_es_comandante THEN
        RETURN QUERY SELECT FALSE, 'No tiene permiso para aprobar esta inspección'::TEXT; RETURN;
    END IF;

    UPDATE inspeccion_360 SET
        estado = 'APROBADA',
        aprobado_por = p_aprobador_id,
        firma_aprobador = p_firma,
        observaciones_comandante = p_observaciones,
        fecha_aprobacion = NOW(),
        updated_at = NOW()
    WHERE id = p_inspeccion_id;

    RETURN QUERY SELECT TRUE, 'Inspección aprobada exitosamente'::TEXT;
END;
$$;

-- 6c. iniciar_salida_unidad — eliminar rama brigada_unidad, usar solo tripulacion_turno
CREATE OR REPLACE FUNCTION public.iniciar_salida_unidad(
    p_unidad_id integer,
    p_ruta_inicial_id integer DEFAULT NULL,
    p_km_inicial numeric DEFAULT NULL,
    p_combustible_inicial numeric DEFAULT NULL,
    p_observaciones text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
    v_salida_id INT;
    v_tripulacion JSONB;
    v_salida_existente INT;
BEGIN
    SELECT id INTO v_salida_existente FROM salida_unidad
    WHERE unidad_id = p_unidad_id AND estado = 'EN_SALIDA';

    IF v_salida_existente IS NOT NULL THEN
        RAISE EXCEPTION 'La unidad ya tiene una salida activa (ID: %)', v_salida_existente;
    END IF;

    -- Obtener tripulación del turno activo
    SELECT json_agg(
        json_build_object(
            'brigada_id', u.id,
            'chapa', u.chapa,
            'nombre', u.nombre_completo,
            'rol', tt.rol_tripulacion
        )
        ORDER BY CASE tt.rol_tripulacion
            WHEN 'PILOTO' THEN 1 WHEN 'COPILOTO' THEN 2 WHEN 'ACOMPAÑANTE' THEN 3 ELSE 4
        END
    )
    INTO v_tripulacion
    FROM tripulacion_turno tt
    JOIN asignacion_unidad au ON tt.asignacion_id = au.id
    JOIN turno t ON au.turno_id = t.id
    JOIN usuario u ON tt.usuario_id = u.id
    WHERE au.unidad_id = p_unidad_id
      AND t.fecha = CURRENT_DATE
      AND t.estado IN ('ACTIVO', 'PLANIFICADO');

    INSERT INTO salida_unidad (unidad_id, ruta_inicial_id, km_inicial, combustible_inicial, observaciones_inicio, tripulacion)
    VALUES (p_unidad_id, p_ruta_inicial_id, p_km_inicial, p_combustible_inicial, p_observaciones, v_tripulacion)
    RETURNING id INTO v_salida_id;

    UPDATE unidad SET ultima_salida = NOW() WHERE id = p_unidad_id;

    RETURN v_salida_id;
END;
$$;

-- ============================================================
-- PASO 7: Eliminar tabla brigada (CASCADE elimina la secuencia)
-- ============================================================
DROP TABLE IF EXISTS brigada CASCADE;

-- ============================================================
-- PASO 8: Recrear vistas usando usuario directamente
-- ============================================================

CREATE VIEW v_brigada AS
SELECT
    u.id,
    u.id AS usuario_id,
    u.nombre_completo AS nombre,
    u.chapa AS codigo,
    u.telefono,
    u.email,
    u.sede_id,
    u.activo,
    u.username,
    u.rol_id,
    u.grupo,
    u.rol_brigada,
    u.genero,
    u.fecha_nacimiento,
    u.licencia_tipo,
    u.licencia_numero,
    u.licencia_vencimiento,
    u.direccion,
    u.contacto_emergencia,
    u.telefono_emergencia
FROM usuario u
JOIN rol r ON u.rol_id = r.id
WHERE r.nombre = 'BRIGADA';

COMMENT ON VIEW v_brigada IS 'Vista de brigadas (usuarios con rol BRIGADA). Reemplaza la tabla brigada eliminada.';

CREATE VIEW v_alertas_activas AS
SELECT
    a.id, a.tipo, a.severidad, a.estado, a.titulo, a.mensaje, a.datos,
    a.sede_id, a.unidad_id, a.brigada_id, a.situacion_id,
    a.atendida_por, a.fecha_atencion, a.nota_resolucion, a.fecha_expiracion,
    a.created_at, a.updated_at,
    s.nombre AS sede_nombre,
    u.codigo AS unidad_codigo,
    u.tipo_unidad,
    b.nombre_completo AS brigada_nombre,
    b.chapa AS brigada_chapa,
    aten.nombre_completo AS atendida_por_nombre,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - a.created_at)) / 60 AS minutos_activa
FROM alerta a
LEFT JOIN sede s ON a.sede_id = s.id
LEFT JOIN unidad u ON a.unidad_id = u.id
LEFT JOIN usuario b ON a.brigada_id = b.id
LEFT JOIN usuario aten ON a.atendida_por = aten.id
WHERE a.estado = 'ACTIVA'
  AND (a.fecha_expiracion IS NULL OR a.fecha_expiracion > CURRENT_TIMESTAMP)
ORDER BY
    CASE a.severidad
        WHEN 'CRITICA' THEN 1 WHEN 'ALTA' THEN 2 WHEN 'MEDIA' THEN 3 ELSE 4
    END,
    a.created_at DESC;

CREATE VIEW v_mis_alertas_no_leidas AS
SELECT
    a.id, a.tipo, a.severidad, a.estado, a.titulo, a.mensaje, a.datos,
    a.sede_id, a.unidad_id, a.brigada_id, a.situacion_id,
    a.atendida_por, a.fecha_atencion, a.nota_resolucion, a.fecha_expiracion,
    a.created_at, a.updated_at,
    s.nombre AS sede_nombre,
    u.codigo AS unidad_codigo,
    b.nombre_completo AS brigada_nombre
FROM alerta a
LEFT JOIN sede s ON a.sede_id = s.id
LEFT JOIN unidad u ON a.unidad_id = u.id
LEFT JOIN usuario b ON a.brigada_id = b.id
WHERE a.estado = 'ACTIVA'
  AND (a.fecha_expiracion IS NULL OR a.fecha_expiracion > CURRENT_TIMESTAMP);
