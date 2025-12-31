-- Migración 066: Corregir validar_disponibilidad_unidad (v2)
-- Fecha: 2025-12-15
--
-- LÓGICA DE NEGOCIO CORRECTA:
-- - La fecha de asignación es solo informativa, NO controla disponibilidad
-- - Una unidad está NO DISPONIBLE si tiene cualquier asignación activa (PLANIFICADO/ACTIVO)
-- - Una unidad se libera cuando:
--   1. Se finaliza la jornada (después de salir)
--   2. El encargado de nóminas elimina manualmente la asignación
--
-- El parámetro p_fecha ya no se usa para filtrar, solo para calcular días de descanso

CREATE OR REPLACE FUNCTION validar_disponibilidad_unidad(
    p_unidad_id INTEGER,
    p_fecha DATE DEFAULT CURRENT_DATE
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
    WITH asignacion_activa AS (
        -- Cualquier asignación activa (sin importar fecha)
        SELECT au.id, t.fecha, t.estado
        FROM asignacion_unidad au
        JOIN turno t ON au.turno_id = t.id
        WHERE au.unidad_id = p_unidad_id
        AND t.estado IN ('PLANIFICADO', 'ACTIVO')
        LIMIT 1
    ),
    ultimo_uso AS (
        -- Último turno finalizado (para calcular días de descanso)
        SELECT MAX(t.fecha) as fecha
        FROM asignacion_unidad au
        JOIN turno t ON au.turno_id = t.id
        WHERE au.unidad_id = p_unidad_id
        AND t.estado = 'FINALIZADO'
    )
    SELECT
        CASE
            WHEN (SELECT COUNT(*) FROM asignacion_activa) > 0 THEN FALSE
            WHEN un.activa = FALSE THEN FALSE
            WHEN un.combustible_actual < 10 THEN FALSE
            ELSE TRUE
        END AS disponible,

        CASE
            WHEN (SELECT COUNT(*) FROM asignacion_activa) > 0 THEN
                'Unidad ya tiene asignación activa (fecha: ' ||
                (SELECT fecha FROM asignacion_activa)::TEXT || ')'
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
'Valida si una unidad está disponible para asignación.
Una unidad NO está disponible si:
- Tiene cualquier asignación activa (PLANIFICADO/ACTIVO) sin importar la fecha
- Está inactiva
- Tiene menos de 10L de combustible
La unidad se libera al finalizar jornada o eliminar asignación manualmente.';

-- Verificar resultado
SELECT 'Migración 066 completada: disponibilidad basada en asignación activa, no en fecha' AS resultado;
