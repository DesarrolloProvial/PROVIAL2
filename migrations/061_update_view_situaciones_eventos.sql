-- ================================================
-- Migración 061: Actualizar vista v_situaciones_completas con eventos persistentes
-- Fecha: 2025-12-16
-- Descripción: Agregar evento_persistente_id y datos del evento a la vista
-- ================================================

-- Eliminar vistas dependientes
DROP VIEW IF EXISTS v_bitacora_unidad CASCADE;

-- Recrear vista principal con datos de eventos
CREATE OR REPLACE VIEW v_situaciones_completas AS
SELECT
    s.id,
    s.uuid,
    s.numero_situacion,
    s.tipo_situacion,
    s.estado,
    s.salida_unidad_id,
    s.ruta_id,
    r.codigo AS ruta_codigo,
    r.nombre AS ruta_nombre,
    s.km,
    s.sentido,
    s.latitud,
    s.longitud,
    s.ubicacion_manual,
    s.combustible,
    s.kilometraje_unidad,
    s.descripcion,
    s.observaciones,
    s.tripulacion_confirmada,
    s.unidad_id,
    u.codigo AS unidad_codigo,
    u.tipo_unidad,
    s.turno_id,
    t.fecha AS turno_fecha,
    s.asignacion_id,
    s.incidente_id,
    i.numero_reporte AS incidente_numero,
    s.evento_persistente_id,
    ep.titulo AS evento_titulo,
    ep.tipo AS evento_tipo,
    s.creado_por,
    uc.nombre_completo AS creado_por_nombre,
    s.actualizado_por,
    ua.nombre_completo AS actualizado_por_nombre,
    s.created_at,
    s.updated_at,
    (SELECT json_agg(json_build_object(
        'id', d.id,
        'tipo_detalle', d.tipo_detalle,
        'datos', d.datos,
        'created_at', d.created_at
    ) ORDER BY d.created_at)
    FROM detalle_situacion d
    WHERE d.situacion_id = s.id) AS detalles
FROM situacion s
LEFT JOIN ruta r ON s.ruta_id = r.id
LEFT JOIN unidad u ON s.unidad_id = u.id
LEFT JOIN turno t ON s.turno_id = t.id
LEFT JOIN incidente i ON s.incidente_id = i.id
LEFT JOIN evento_persistente ep ON s.evento_persistente_id = ep.id
LEFT JOIN usuario uc ON s.creado_por = uc.id
LEFT JOIN usuario ua ON s.actualizado_por = ua.id
ORDER BY s.created_at DESC;

COMMENT ON VIEW v_situaciones_completas IS 'Vista completa de situaciones con todos los datos relacionados, incluyendo eventos persistentes';

-- Recrear vista de bitacora
CREATE OR REPLACE VIEW v_bitacora_unidad AS
SELECT
    s.id,
    s.uuid,
    s.numero_situacion,
    s.unidad_id,
    u.codigo AS unidad_codigo,
    s.tipo_situacion,
    s.estado,
    s.salida_unidad_id,
    s.ruta_codigo,
    s.km,
    s.sentido,
    s.latitud,
    s.longitud,
    s.descripcion,
    s.observaciones,
    s.evento_titulo,
    s.created_at AS fecha_hora,
    s.creado_por_nombre AS reportado_por,
    s.turno_fecha,
    CASE
        WHEN s.estado = 'CERRADA' THEN
            EXTRACT(EPOCH FROM (s.updated_at - s.created_at)) / 60
        ELSE NULL
    END AS duracion_minutos,
    CASE WHEN s.detalles IS NOT NULL THEN TRUE ELSE FALSE END AS tiene_detalles,
    (
        SELECT json_object_agg(tipo_detalle, cantidad)
        FROM (
            SELECT
                d.tipo_detalle,
                COUNT(*) AS cantidad
            FROM detalle_situacion d
            WHERE d.situacion_id = s.id
            GROUP BY d.tipo_detalle
        ) AS detalles_count
    ) AS resumen_detalles
FROM v_situaciones_completas s
JOIN unidad u ON s.unidad_id = u.id
ORDER BY s.unidad_id, s.created_at DESC;

COMMENT ON VIEW v_bitacora_unidad IS 'Bitácora completa de situaciones por unidad con datos de eventos';
