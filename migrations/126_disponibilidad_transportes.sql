-- Migración 126: Disponibilidad de unidades por Transportes
-- Fecha: 2026-03-02
-- Propósito: Transportes autoriza cada unidad antes de que Operaciones pueda asignarla.
--            Corrige también el umbral de combustible (era litros, ahora fracción 0-1.0).

-- 1. Agregar columnas a la tabla unidad
ALTER TABLE unidad
  ADD COLUMN IF NOT EXISTS disponible_transportes BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS instrucciones_transportes TEXT;

-- 2. Preservar operaciones actuales: todas las unidades activas quedan disponibles
UPDATE unidad SET disponible_transportes = TRUE WHERE activa = TRUE;

-- 3. Reemplazar función validar_disponibilidad_unidad con nueva lógica
CREATE OR REPLACE FUNCTION validar_disponibilidad_unidad(
    p_unidad_id INTEGER,
    p_fecha DATE
)
RETURNS TABLE (
    disponible          BOOLEAN,
    mensaje             TEXT,
    ultimo_uso_fecha    DATE,
    dias_descanso       INTEGER,
    combustible_suficiente BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH asignaciones_fecha AS (
        SELECT au.id
        FROM asignacion_unidad au
        JOIN turno t ON au.turno_id = t.id
        WHERE au.unidad_id = p_unidad_id
          AND t.estado IN ('PLANIFICADO', 'ACTIVO')
          AND (
              t.fecha = p_fecha
              OR (t.fecha <= p_fecha AND COALESCE(t.fecha_fin, t.fecha) >= p_fecha)
          )
    ),
    ultimo_uso AS (
        SELECT MAX(t.fecha) AS fecha
        FROM asignacion_unidad au
        JOIN turno t ON au.turno_id = t.id
        WHERE au.unidad_id = p_unidad_id
          AND t.fecha < p_fecha
    )
    SELECT
        CASE
            WHEN (SELECT COUNT(*) FROM asignaciones_fecha) > 0          THEN FALSE
            WHEN un.activa = FALSE                                        THEN FALSE
            WHEN un.disponible_transportes = FALSE                        THEN FALSE
            WHEN un.combustible_actual IS NOT NULL
              AND un.combustible_actual < 0.25                           THEN FALSE
            ELSE TRUE
        END AS disponible,

        CASE
            WHEN (SELECT COUNT(*) FROM asignaciones_fecha) > 0          THEN 'Unidad ya asignada para esta fecha'
            WHEN un.activa = FALSE                                        THEN 'Unidad está inactiva'
            WHEN un.disponible_transportes = FALSE                        THEN 'No autorizada por Transportes'
            WHEN un.combustible_actual IS NOT NULL
              AND un.combustible_actual < 0.25                           THEN 'Combustible insuficiente (menos de 1/4)'
            ELSE 'Unidad disponible'
        END AS mensaje,

        (SELECT fecha FROM ultimo_uso)                                   AS ultimo_uso_fecha,
        COALESCE(p_fecha - (SELECT fecha FROM ultimo_uso), 999)          AS dias_descanso,
        COALESCE(un.combustible_actual IS NULL OR un.combustible_actual >= 0.25, TRUE) AS combustible_suficiente

    FROM unidad un
    WHERE un.id = p_unidad_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validar_disponibilidad_unidad IS
'Valida si una unidad está disponible para una fecha específica.
Condiciones: asignación existente, inactiva, no autorizada por Transportes, combustible < 1/4.
Migración 126: agrega check disponible_transportes; corrige combustible (fracción 0-1.0, no litros).';

-- 4. Actualizar vista v_asignaciones_por_sede para incluir estado_nomina
--    (necesario para el modal de selección en DashboardSedesPage)
CREATE OR REPLACE VIEW v_asignaciones_por_sede AS
SELECT
    t.id as turno_id,
    t.fecha,
    t.estado as turno_estado,
    t.publicado,
    t.fecha_publicacion,
    t.sede_id,
    s.nombre as sede_nombre,
    s.codigo as sede_codigo,

    t.creado_por,
    uc.nombre_completo as creado_por_nombre,

    cv.color_fondo,
    cv.color_fondo_header,
    cv.color_texto,
    cv.color_acento,
    cv.fuente,
    cv.tamano_fuente,
    cv.alerta_rotacion_rutas_activa,
    cv.umbral_rotacion_rutas,

    au.id as asignacion_id,
    au.unidad_id,
    u.codigo as unidad_codigo,
    u.tipo_unidad,
    u.placa as unidad_placa,

    au.ruta_id,
    r.codigo as ruta_codigo,
    r.nombre as ruta_nombre,
    au.km_inicio,
    au.km_final,
    au.sentido,

    au.acciones,
    au.acciones_formato,
    au.hora_salida,

    au.situacion_fija_id,
    sf.titulo as situacion_fija_titulo,
    sf.tipo as situacion_fija_tipo,

    -- Estado de la nómina (BORRADOR / LIBERADA) — nuevo en migración 126
    au.estado_nomina,

    CASE
        WHEN su.estado = 'EN_SALIDA' THEN true
        ELSE false
    END as en_ruta,
    su.estado as salida_estado,

    au.created_at as asignacion_created_at

FROM turno t
LEFT JOIN sede s ON t.sede_id = s.id
LEFT JOIN usuario uc ON t.creado_por = uc.id
LEFT JOIN configuracion_visual_sede cv ON t.sede_id = cv.sede_id
LEFT JOIN asignacion_unidad au ON t.id = au.turno_id
LEFT JOIN unidad u ON au.unidad_id = u.id
LEFT JOIN ruta r ON au.ruta_id = r.id
LEFT JOIN situacion_fija sf ON au.situacion_fija_id = sf.id
LEFT JOIN salida_unidad su ON au.unidad_id = su.unidad_id
    AND su.estado = 'EN_SALIDA'
    AND DATE(su.fecha_hora_salida) = t.fecha
ORDER BY t.sede_id, au.hora_salida;

-- 5. Verificar resultado
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'unidad'
  AND column_name IN ('disponible_transportes', 'instrucciones_transportes')
ORDER BY column_name;

SELECT '126: disponible_transportes + instrucciones_transportes agregados a unidad' AS resultado;
