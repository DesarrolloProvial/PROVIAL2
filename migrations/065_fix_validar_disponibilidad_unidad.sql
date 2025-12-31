-- Migración 065: Corregir validar_disponibilidad_unidad
-- Fecha: 2025-12-15
-- Problema: La función incluía turnos de los últimos 7 días en lugar de solo la fecha solicitada
--           Esto causaba que unidades con asignaciones antiguas aparecieran como no disponibles

-- La condición t.fecha >= p_fecha - INTERVAL '7 days' se usaba para calcular días de descanso
-- pero causaba que COUNT(au.id) > 0 incluyera asignaciones pasadas

CREATE OR REPLACE FUNCTION validar_disponibilidad_unidad(
    p_unidad_id INTEGER,
    p_fecha DATE
)
RETURNS TABLE (
    disponible BOOLEAN,
    mensaje TEXT,
    ultimo_uso_fecha DATE,
    dias_descanso INTEGER,
    combustible_suficiente BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH asignaciones_fecha AS (
        -- Asignaciones SOLO para la fecha solicitada
        SELECT au.id, t.fecha
        FROM asignacion_unidad au
        JOIN turno t ON au.turno_id = t.id
        WHERE au.unidad_id = p_unidad_id
        AND t.estado IN ('PLANIFICADO', 'ACTIVO')
        AND (
            -- Fecha exacta
            t.fecha = p_fecha
            -- O rango que incluya la fecha
            OR (t.fecha <= p_fecha AND COALESCE(t.fecha_fin, t.fecha) >= p_fecha)
        )
    ),
    ultimo_uso AS (
        -- Último uso real (para calcular días de descanso)
        SELECT MAX(t.fecha) as fecha
        FROM asignacion_unidad au
        JOIN turno t ON au.turno_id = t.id
        WHERE au.unidad_id = p_unidad_id
        AND t.fecha < p_fecha
    )
    SELECT
        CASE
            WHEN (SELECT COUNT(*) FROM asignaciones_fecha) > 0 THEN FALSE
            WHEN un.activa = FALSE THEN FALSE
            WHEN un.combustible_actual < 10 THEN FALSE
            ELSE TRUE
        END AS disponible,

        CASE
            WHEN (SELECT COUNT(*) FROM asignaciones_fecha) > 0 THEN 'Unidad ya asignada para esta fecha'
            WHEN un.activa = FALSE THEN 'Unidad está inactiva'
            WHEN un.combustible_actual < 10 THEN 'Combustible insuficiente (menos de 10L)'
            ELSE 'Unidad disponible'
        END AS mensaje,

        (SELECT fecha FROM ultimo_uso) AS ultimo_uso_fecha,
        COALESCE(p_fecha - (SELECT fecha FROM ultimo_uso), 999) AS dias_descanso,
        COALESCE(un.combustible_actual >= 10, FALSE) AS combustible_suficiente

    FROM unidad un
    WHERE un.id = p_unidad_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validar_disponibilidad_unidad IS
'Valida si una unidad está disponible para una fecha específica.
Considera: asignaciones existentes en esa fecha, estado activo, y combustible.
CORREGIDO: Ya no incluye asignaciones de fechas pasadas en la validación.';

-- Verificar resultado
SELECT 'Migración 065 completada: validar_disponibilidad_unidad corregida' AS resultado;
