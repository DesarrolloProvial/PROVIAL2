-- Migración 068: Corregir validar_disponibilidad_brigada para usar salidas reales
-- Fecha: 2025-12-15
--
-- PROBLEMA: La función usaba asignaciones (turno.fecha) para determinar descanso
-- CORRECCIÓN: Usar salidas reales (salida_unidad) - solo cuenta si realmente salió
--
-- Lógica correcta:
-- - Una brigada necesita descanso solo si REALMENTE SALIÓ (tiene salida_unidad)
-- - Si fue asignada pero no salió (asignación cancelada), no cuenta para descanso

CREATE OR REPLACE FUNCTION validar_disponibilidad_brigada(
    p_usuario_id INTEGER,
    p_fecha DATE
)
RETURNS TABLE (
    disponible BOOLEAN,
    mensaje TEXT,
    ultimo_turno_fecha DATE,
    dias_descanso INTEGER
) AS $$
DECLARE
    v_tiene_asignacion_hoy BOOLEAN;
    v_tiene_salida_activa BOOLEAN;
    v_ultima_salida DATE;
    v_dias_descanso INTEGER;
BEGIN
    -- 1. Verificar si tiene asignación activa para esta fecha
    SELECT EXISTS(
        SELECT 1
        FROM tripulacion_turno tt
        JOIN asignacion_unidad au ON tt.asignacion_id = au.id
        JOIN turno t ON au.turno_id = t.id
        WHERE tt.usuario_id = p_usuario_id
          AND t.estado IN ('PLANIFICADO', 'ACTIVO')
          AND (t.fecha = p_fecha OR (t.fecha <= p_fecha AND COALESCE(t.fecha_fin, t.fecha) >= p_fecha))
    ) INTO v_tiene_asignacion_hoy;

    -- 2. Verificar si tiene salida activa (EN_SALIDA)
    SELECT EXISTS(
        SELECT 1
        FROM salida_unidad su
        JOIN tripulacion_turno tt ON su.unidad_id = (
            SELECT au.unidad_id
            FROM asignacion_unidad au
            WHERE au.id = tt.asignacion_id
        )
        WHERE tt.usuario_id = p_usuario_id
          AND su.estado = 'EN_SALIDA'
    ) INTO v_tiene_salida_activa;

    -- 3. Obtener última SALIDA REAL (no asignación) de los últimos 30 días
    -- Busca en salida_unidad donde el usuario fue parte de la tripulación
    SELECT MAX(su.fecha_hora_salida::DATE) INTO v_ultima_salida
    FROM salida_unidad su
    JOIN asignacion_unidad au ON su.unidad_id = au.unidad_id
    JOIN turno t ON au.turno_id = t.id
    JOIN tripulacion_turno tt ON tt.asignacion_id = au.id
    WHERE tt.usuario_id = p_usuario_id
      AND su.fecha_hora_salida >= (p_fecha - INTERVAL '30 days')
      AND su.fecha_hora_salida::DATE < p_fecha
      AND su.estado IN ('EN_SALIDA', 'FINALIZADA', 'CANCELADA');

    -- 4. Calcular días de descanso basado en SALIDAS REALES
    IF v_ultima_salida IS NOT NULL THEN
        v_dias_descanso := p_fecha - v_ultima_salida;
    ELSE
        v_dias_descanso := 999; -- Nunca ha salido o hace más de 30 días
    END IF;

    -- 5. Retornar resultado
    RETURN QUERY SELECT
        CASE
            WHEN v_tiene_salida_activa THEN FALSE
            WHEN v_tiene_asignacion_hoy THEN FALSE
            WHEN v_dias_descanso < 2 THEN FALSE
            ELSE TRUE
        END,
        CASE
            WHEN v_tiene_salida_activa THEN 'Brigada tiene salida activa en este momento'::TEXT
            WHEN v_tiene_asignacion_hoy THEN 'Brigada ya tiene asignación para esta fecha'::TEXT
            WHEN v_dias_descanso = 0 THEN 'Brigada salió hoy - necesita descanso'::TEXT
            WHEN v_dias_descanso = 1 THEN 'Brigada salió ayer - descanso recomendado'::TEXT
            ELSE 'Brigada disponible'::TEXT
        END,
        v_ultima_salida,
        v_dias_descanso;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validar_disponibilidad_brigada IS
'Valida disponibilidad de brigada basándose en SALIDAS REALES (salida_unidad),
no en asignaciones. Solo cuenta para descanso si realmente salió.';

SELECT 'Migración 068: validar_disponibilidad_brigada ahora usa salidas reales' AS resultado;
