-- 096_update_view_situaciones_catalogo.sql (CORREGIDO V3)
-- Actualiza la visión para incluir campos del catálogo dinámico
-- Corrige error de columnas duplicadas listando campos explícitamente

BEGIN;

-- 1. Eliminar vistas en cascada
DROP VIEW IF EXISTS v_situaciones_completas CASCADE;
-- Nota: Esto elimina v_bitacora_unidad automáticamente

-- 2. Crear v_situaciones_completas actualizada (CAMPOS EXPLICITOS)
CREATE OR REPLACE VIEW v_situaciones_completas AS
SELECT 
    -- Campos de Situacion (s.* expandido para evitar duplicados)
    s.id,
    s.uuid,
    s.numero_situacion,
    s.tipo_situacion,
    s.estado,
    s.salida_unidad_id,
    s.ruta_id,
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
    s.turno_id,
    s.asignacion_id,
    s.incidente_id,
    s.evento_persistente_id,
    s.creado_por,
    s.actualizado_por,
    s.created_at,
    s.updated_at,
    s.tipo_situacion_id,
    
    -- Campos de Relaciones
    u.codigo as unidad_codigo,
    u.tipo_unidad as tipo_unidad,
    r.codigo as ruta_codigo,
    r.nombre as ruta_nombre,
    t.fecha as turno_fecha,
    i.numero_reporte as incidente_numero,
    uc.nombre_completo as creado_por_nombre,
    ua.nombre_completo as actualizado_por_nombre,
    
    -- Campos de Evento Persistente
    ep.titulo as evento_titulo,
    ep.tipo as evento_tipo,
    
    -- Campos de Catálogo
    cts.nombre as subtipo_nombre,
    cts.icono as subtipo_icono,
    ccs.nombre as categoria_nombre,
    ccs.codigo as categoria_codigo,
    ccs.icono as categoria_icono,
    
    -- Detalles JSON
    (SELECT json_agg(json_build_object(
        'id', d.id,
        'tipo_detalle', d.tipo_detalle,
        'datos', d.datos,
        'created_at', d.created_at
    ) ORDER BY d.created_at)
    FROM detalle_situacion d
    WHERE d.situacion_id = s.id) AS detalles
FROM situacion s
LEFT JOIN unidad u ON s.unidad_id = u.id
LEFT JOIN ruta r ON s.ruta_id = r.id
LEFT JOIN turno t ON s.turno_id = t.id
LEFT JOIN incidente i ON s.incidente_id = i.id
LEFT JOIN usuario uc ON s.creado_por = uc.id
LEFT JOIN usuario ua ON s.actualizado_por = ua.id
LEFT JOIN evento_persistente ep ON s.evento_persistente_id = ep.id
LEFT JOIN catalogo_tipo_situacion cts ON s.tipo_situacion_id = cts.id
LEFT JOIN catalogo_categoria_situacion ccs ON cts.categoria_id = ccs.id
ORDER BY s.created_at DESC;

COMMENT ON VIEW v_situaciones_completas IS 'Vista completa de situaciones con todos los datos relacionados, incluyendo catálogo dinámico';

-- 3. Recrear v_bitacora_unidad (Dependiente)
CREATE OR REPLACE VIEW v_bitacora_unidad AS
SELECT
    s.id,
    s.uuid,
    s.numero_situacion,
    s.unidad_id,
    s.unidad_codigo,
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
    ) AS resumen_detalles,
    -- Campos agregados del catálogo
    s.subtipo_nombre,
    s.categoria_codigo
FROM v_situaciones_completas s
JOIN unidad u ON s.unidad_id = u.id
ORDER BY s.unidad_id, s.created_at DESC;

COMMENT ON VIEW v_bitacora_unidad IS 'Bitácora completa de situaciones por unidad con datos de eventos y catálogo';

COMMIT;
