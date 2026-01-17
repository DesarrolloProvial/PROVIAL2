-- =====================================================
-- Fix v_mi_salida_activa - Remover filtro de fecha
-- La lógica se basa en estado EN_SALIDA, no en fecha
-- =====================================================

DROP VIEW IF EXISTS v_mi_salida_activa CASCADE;

CREATE OR REPLACE VIEW v_mi_salida_activa AS
-- Parte 1: Brigadas con asignación permanente
SELECT 
    u.id AS brigada_id,
    u.chapa,
    u.nombre_completo,
    s.id AS salida_id,
    s.unidad_id,
    un.codigo AS unidad_codigo,
    un.tipo_unidad,
    s.estado,
    s.fecha_hora_salida,
    s.fecha_hora_regreso,
    EXTRACT(EPOCH FROM (COALESCE(s.fecha_hora_regreso, NOW()) - s.fecha_hora_salida)) / 3600 AS horas_salida,
    s.ruta_inicial_id AS ruta_id,
    r.codigo AS ruta_codigo,
    r.nombre AS ruta_nombre,
    s.km_inicial,
    s.combustible_inicial,
    s.tripulacion,
    'PERMANENTE' AS tipo_asignacion,
    bu.rol_tripulacion AS mi_rol,
    (
        SELECT json_build_object(
            'id', sit.id,
            'tipo', sit.tipo_situacion,
            'fecha_hora', sit.created_at
        )
        FROM situacion sit
        WHERE sit.salida_unidad_id = s.id
        ORDER BY sit.created_at
        LIMIT 1
    ) AS primera_situacion
FROM usuario u
JOIN brigada_unidad bu ON u.id = bu.brigada_id AND bu.activo = true
JOIN unidad un ON bu.unidad_id = un.id
JOIN salida_unidad s ON un.id = s.unidad_id AND s.estado = 'EN_SALIDA'
LEFT JOIN ruta r ON s.ruta_inicial_id = r.id

UNION ALL

-- Parte 2: Brigadas con asignación por turno
SELECT 
    u.id AS brigada_id,
    u.chapa,
    u.nombre_completo,
    s.id AS salida_id,
    s.unidad_id,
    un.codigo AS unidad_codigo,
    un.tipo_unidad,
    s.estado,
    s.fecha_hora_salida,
    s.fecha_hora_regreso,
    EXTRACT(EPOCH FROM (COALESCE(s.fecha_hora_regreso, NOW()) - s.fecha_hora_salida)) / 3600 AS horas_salida,
    s.ruta_inicial_id AS ruta_id,
    r.codigo AS ruta_codigo,
    r.nombre AS ruta_nombre,
    s.km_inicial,
    s.combustible_inicial,
    s.tripulacion,
    'TURNO' AS tipo_asignacion,
    tt.rol_tripulacion AS mi_rol,
    (
        SELECT json_build_object(
            'id', sit.id,
            'tipo', sit.tipo_situacion,
            'fecha_hora', sit.created_at
        )
        FROM situacion sit
        WHERE sit.salida_unidad_id = s.id
        ORDER BY sit.created_at
        LIMIT 1
    ) AS primera_situacion
FROM usuario u
JOIN tripulacion_turno tt ON u.id = tt.usuario_id
JOIN asignacion_unidad au ON tt.asignacion_id = au.id
JOIN turno t ON au.turno_id = t.id
JOIN unidad un ON au.unidad_id = un.id
JOIN salida_unidad s ON un.id = s.unidad_id AND s.estado = 'EN_SALIDA'
LEFT JOIN ruta r ON s.ruta_inicial_id = r.id
WHERE t.estado IN ('PLANIFICADO', 'ACTIVO');
-- REMOVIDO: AND date(s.fecha_hora_salida) = CURRENT_DATE

COMMENT ON VIEW v_mi_salida_activa IS 
'Vista para obtener la salida activa de un brigada.
Se basa únicamente en el estado EN_SALIDA de la salida_unidad.
NO filtra por fecha para evitar problemas de zona horaria.';
