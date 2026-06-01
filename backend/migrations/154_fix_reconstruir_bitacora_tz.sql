-- Migration 154: Corregir timezone en reconstruir_bitacora_historica
-- crear_snapshot_bitacora guarda fecha = fecha_hora_salida::DATE (UTC)
-- El filtro debe usar el mismo cast para que los rangos coincidan

CREATE OR REPLACE FUNCTION public.reconstruir_bitacora_historica(
    p_fecha_inicio DATE DEFAULT NULL,
    p_fecha_fin    DATE DEFAULT NULL
) RETURNS TABLE(reconstruidos integer, mensaje text)
LANGUAGE plpgsql
AS $$
DECLARE
    v_salida    RECORD;
    v_count     INTEGER := 0;
    v_fecha_ini DATE := COALESCE(p_fecha_inicio, '2024-01-01');
    v_fecha_fin DATE := COALESCE(p_fecha_fin, CURRENT_DATE);
BEGIN
    FOR v_salida IN
        SELECT su.id, su.finalizada_por
        FROM salida_unidad su
        WHERE su.estado = 'FINALIZADA'
          -- Mismo cast que usar crear_snapshot_bitacora para calcular fecha_jornada
          AND su.fecha_hora_salida::DATE BETWEEN v_fecha_ini AND v_fecha_fin
        ORDER BY su.fecha_hora_salida
    LOOP
        BEGIN
            PERFORM crear_snapshot_bitacora(v_salida.id, v_salida.finalizada_por);
            v_count := v_count + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Error reconstruyendo salida_id=%: %', v_salida.id, SQLERRM;
        END;
    END LOOP;

    RETURN QUERY SELECT
        v_count,
        format(
            'Reconstruidas %s entradas de bitacora entre %s y %s.',
            v_count, v_fecha_ini, v_fecha_fin
        )::TEXT;
END;
$$;

COMMENT ON FUNCTION public.reconstruir_bitacora_historica(DATE, DATE) IS
'Regenera bitacora_historica desde las tablas operacionales. Filtra por fecha_hora_salida::DATE (UTC), igual que crear_snapshot_bitacora. Solo procesa estado=FINALIZADA.';
