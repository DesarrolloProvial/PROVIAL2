-- 096_update_view_situaciones_catalogo.sql
-- Actualiza la visión para incluir campos del catálogo dinámico

BEGIN;

DROP VIEW IF EXISTS v_situaciones_completas;

CREATE OR REPLACE VIEW v_situaciones_completas AS
SELECT 
    s.*,
    u.codigo as unidad_codigo,
    u.tipo_vehiculo as tipo_unidad,
    r.codigo as ruta_codigo,
    r.nombre as ruta_nombre,
    t.fecha_inicio as turno_fecha,
    i.numero_incidente as incidente_numero,
    COALESCE(uc.nombre || ' ' || uc.apellido, uc.username) as creado_por_nombre,
    COALESCE(ua.nombre || ' ' || ua.apellido, ua.username) as actualizado_por_nombre,
    ep.id as evento_persistente_id,
    ep.titulo as evento_titulo,
    ep.tipo as evento_tipo,
    cts.nombre as subtipo_nombre,
    cts.icono as subtipo_icono,
    ccs.nombre as categoria_nombre,
    ccs.codigo as categoria_codigo,
    ccs.icono as categoria_icono
FROM situacion s
LEFT JOIN unidad u ON s.unidad_id = u.id
LEFT JOIN ruta r ON s.ruta_id = r.id
LEFT JOIN turno t ON s.turno_id = t.id
LEFT JOIN incidente i ON s.incidente_id = i.id
LEFT JOIN usuario uc ON s.creado_por = uc.id
LEFT JOIN usuario ua ON s.actualizado_por = ua.id
LEFT JOIN evento_persistente_situacion eps ON s.id = eps.situacion_id
LEFT JOIN evento_persistente ep ON eps.evento_persistente_id = ep.id
LEFT JOIN catalogo_tipo_situacion cts ON s.tipo_situacion_id = cts.id
LEFT JOIN catalogo_categoria_situacion ccs ON cts.categoria_id = ccs.id;

COMMIT;
