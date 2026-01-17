-- =====================================================
-- Fix v_mi_asignacion_hoy - Remover filtro de fecha
-- La lógica ahora se basa en salida activa, no en fecha
-- =====================================================

DROP VIEW IF EXISTS v_mi_asignacion_hoy CASCADE;

CREATE OR REPLACE VIEW v_mi_asignacion_hoy AS
SELECT 
    usr.id AS usuario_id,
    usr.nombre_completo,
    t.id AS turno_id,
    t.fecha,
    t.fecha_fin,
    t.estado AS turno_estado,
    a.id AS asignacion_id,
    a.estado_nomina,
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
    CASE
        WHEN a.km_inicio IS NOT NULL AND a.km_final IS NOT NULL 
            THEN 'Km ' || a.km_inicio || ' - Km ' || a.km_final
        WHEN a.km_inicio IS NOT NULL 
            THEN 'Desde Km ' || a.km_inicio
        WHEN a.km_final IS NOT NULL 
            THEN 'Hasta Km ' || a.km_final
        ELSE NULL
    END AS recorrido_permitido,
    a.hora_salida,
    a.hora_entrada_estimada,
    a.hora_salida_real,
    -- Información de salida activa
    s.id AS salida_id,
    s.estado AS salida_estado,
    -- Tripulación completa
    (
        SELECT json_agg(
            json_build_object(
                'usuario_id', u2.id,
                'nombre', u2.nombre_completo,
                'chapa', u2.chapa,
                'rol', tc2.rol_tripulacion,
                'telefono', u2.telefono,
                'es_comandante', tc2.es_comandante
            ) ORDER BY 
                CASE tc2.rol_tripulacion
                    WHEN 'PILOTO' THEN 1
                    WHEN 'COPILOTO' THEN 2
                    WHEN 'ACOMPAÑANTE' THEN 3
                    ELSE 4
                END
        )
        FROM tripulacion_turno tc2
        JOIN usuario u2 ON tc2.usuario_id = u2.id
        WHERE tc2.asignacion_id = a.id
    ) AS tripulacion,
    -- Compañeros (sin incluir al usuario actual)
    (
        SELECT json_agg(
            json_build_object(
                'usuario_id', u2.id,
                'nombre', u2.nombre_completo,
                'chapa', u2.chapa,
                'rol', tc2.rol_tripulacion,
                'telefono', u2.telefono
            ) ORDER BY 
                CASE tc2.rol_tripulacion
                    WHEN 'PILOTO' THEN 1
                    WHEN 'COPILOTO' THEN 2
                    WHEN 'ACOMPAÑANTE' THEN 3
                    ELSE 4
                END
        )
        FROM tripulacion_turno tc2
        JOIN usuario u2 ON tc2.usuario_id = u2.id
        WHERE tc2.asignacion_id = a.id 
          AND tc2.usuario_id <> usr.id
    ) AS companeros
FROM usuario usr
JOIN tripulacion_turno tc ON usr.id = tc.usuario_id
JOIN asignacion_unidad a ON tc.asignacion_id = a.id
JOIN turno t ON a.turno_id = t.id
JOIN unidad u ON a.unidad_id = u.id
LEFT JOIN ruta r ON a.ruta_id = r.id
LEFT JOIN salida_unidad s ON s.unidad_id = u.id AND s.estado = 'EN_SALIDA'
WHERE 
    -- Solo asignaciones que no han finalizado
    a.hora_entrada_real IS NULL
    -- Turno debe estar activo o planificado
    AND t.estado IN ('PLANIFICADO', 'ACTIVO')
    -- Opcional: solo mostrar si tiene salida activa O si es para futuro cercano
    AND (
        s.id IS NOT NULL  -- Tiene salida activa
        OR t.fecha >= CURRENT_DATE - INTERVAL '1 day'  -- O es del día anterior (para turnos nocturnos)
    );

COMMENT ON VIEW v_mi_asignacion_hoy IS 
'Vista para obtener la asignación activa de un brigada. 
Se basa en salida activa (EN_SALIDA) y no ha finalizado (hora_entrada_real IS NULL).
No depende estrictamente de la fecha del turno para evitar problemas de zona horaria.';
