-- Migración: Agregar sede_id y sede_nombre a la vista v_situaciones_completas
-- Fecha: 2025-12-29
-- Descripción: Agrega información de la sede para mostrar colores diferentes por sede en el mapa

DROP VIEW IF EXISTS v_situaciones_completas;

CREATE VIEW v_situaciones_completas AS
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
    u.sede_id,
    se.nombre AS sede_nombre,
    s.turno_id,
    t.fecha AS turno_fecha,
    s.asignacion_id,
    s.incidente_id,
    i.numero_reporte AS incidente_numero,
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
LEFT JOIN sede se ON u.sede_id = se.id
LEFT JOIN turno t ON s.turno_id = t.id
LEFT JOIN incidente i ON s.incidente_id = i.id
LEFT JOIN usuario uc ON s.creado_por = uc.id
LEFT JOIN usuario ua ON s.actualizado_por = ua.id
ORDER BY s.created_at DESC;

-- Comentario para documentación
COMMENT ON VIEW v_situaciones_completas IS 'Vista completa de situaciones con información de ruta, unidad, sede, turno e incidente';
