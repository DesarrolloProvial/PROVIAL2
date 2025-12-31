-- ============================================================================
-- Migración: Crear tabla bitacora_historica
-- Descripción: Tabla optimizada para almacenar años de datos históricos
--              de jornadas laborales finalizadas
-- ============================================================================

-- La tabla está diseñada para:
-- 1. Almacenar millones de registros eficientemente (años de datos)
-- 2. Usar referencias a tablas existentes (no duplicar datos de pilotos, vehículos, etc.)
-- 3. Usar JSONB comprimido para datos variables (situaciones, ingresos)
-- 4. Índices optimizados para consultas frecuentes (fecha + unidad)
-- 5. Particionamiento por fecha para mejor rendimiento

-- Crear tabla principal (particionada por rango de fechas)
CREATE TABLE IF NOT EXISTS bitacora_historica (
    id BIGSERIAL,

    -- Identificadores principales (usados para búsqueda)
    fecha DATE NOT NULL,                          -- Solo fecha, sin hora (para indexar)
    unidad_id INTEGER NOT NULL REFERENCES unidad(id) ON DELETE RESTRICT,
    salida_id INTEGER,                            -- Referencia a salida_unidad (puede ser NULL si se eliminó)

    -- Referencias a datos maestros (NO duplicamos datos)
    sede_origen_id INTEGER REFERENCES sede(id) ON DELETE SET NULL,
    ruta_inicial_id INTEGER REFERENCES ruta(id) ON DELETE SET NULL,

    -- Datos de kilometraje y combustible (valores simples, no referencias)
    km_inicial NUMERIC(8,2),
    km_final NUMERIC(8,2),
    km_recorridos NUMERIC(8,2),
    combustible_inicial NUMERIC(5,2),
    combustible_final NUMERIC(5,2),

    -- Horarios de la jornada
    hora_inicio TIMESTAMPTZ NOT NULL,
    hora_fin TIMESTAMPTZ,
    duracion_minutos INTEGER,                     -- Calculado para consultas rápidas

    -- Tripulación: Array de IDs de usuarios (referencia, no duplicamos nombres)
    -- Formato: [{"usuario_id": 123, "rol": "PILOTO"}, {"usuario_id": 456, "rol": "COPILOTO"}]
    tripulacion_ids JSONB NOT NULL DEFAULT '[]',

    -- Situaciones del día (resumen compacto)
    -- Formato: [{"id": 1, "tipo": "INCIDENTE", "km": 45.5, "hora": "08:30"}, ...]
    situaciones_resumen JSONB NOT NULL DEFAULT '[]',
    total_situaciones INTEGER DEFAULT 0,

    -- Ingresos a sede del día (resumen compacto)
    -- Formato: [{"id": 1, "tipo": "COMBUSTIBLE", "sede_id": 5, "duracion_min": 30}, ...]
    ingresos_resumen JSONB NOT NULL DEFAULT '[]',
    total_ingresos INTEGER DEFAULT 0,

    -- Contadores precalculados para reportes rápidos
    total_incidentes INTEGER DEFAULT 0,
    total_asistencias INTEGER DEFAULT 0,
    total_emergencias INTEGER DEFAULT 0,
    total_regulaciones INTEGER DEFAULT 0,
    total_patrullajes INTEGER DEFAULT 0,

    -- Observaciones generales
    observaciones_inicio TEXT,
    observaciones_fin TEXT,

    -- Quién finalizó la jornada
    finalizado_por INTEGER REFERENCES usuario(id) ON DELETE SET NULL,

    -- Metadatos de auditoría
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraint de unicidad: una sola entrada por unidad por día
    CONSTRAINT bitacora_historica_unidad_fecha_unique UNIQUE (fecha, unidad_id),

    -- Primary key incluye fecha para particionamiento
    PRIMARY KEY (id, fecha)
) PARTITION BY RANGE (fecha);

-- Crear particiones por año (más eficiente para consultas por rango de fechas)
-- Partición 2024
CREATE TABLE IF NOT EXISTS bitacora_historica_2024 PARTITION OF bitacora_historica
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Partición 2025
CREATE TABLE IF NOT EXISTS bitacora_historica_2025 PARTITION OF bitacora_historica
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- Partición 2026 (preparada para el futuro)
CREATE TABLE IF NOT EXISTS bitacora_historica_2026 PARTITION OF bitacora_historica
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- ============================================================================
-- ÍNDICES OPTIMIZADOS
-- ============================================================================

-- Índice principal: búsqueda por fecha + unidad (más frecuente desde COP)
CREATE INDEX IF NOT EXISTS idx_bitacora_fecha_unidad
    ON bitacora_historica (fecha DESC, unidad_id);

-- Índice para búsquedas por unidad en cualquier fecha
CREATE INDEX IF NOT EXISTS idx_bitacora_unidad
    ON bitacora_historica (unidad_id, fecha DESC);

-- Índice para reportes por rango de fechas
CREATE INDEX IF NOT EXISTS idx_bitacora_fecha
    ON bitacora_historica (fecha DESC);

-- Índice GIN para búsquedas dentro de JSONB de tripulación
-- Permite buscar: "todas las jornadas donde participó el usuario X"
CREATE INDEX IF NOT EXISTS idx_bitacora_tripulacion_gin
    ON bitacora_historica USING GIN (tripulacion_ids);

-- Índice para reportes por sede
CREATE INDEX IF NOT EXISTS idx_bitacora_sede
    ON bitacora_historica (sede_origen_id, fecha DESC)
    WHERE sede_origen_id IS NOT NULL;

-- ============================================================================
-- FUNCIÓN: Crear snapshot de jornada finalizada
-- ============================================================================

CREATE OR REPLACE FUNCTION crear_snapshot_bitacora(
    p_salida_id INTEGER,
    p_finalizado_por INTEGER
) RETURNS BIGINT AS $$
DECLARE
    v_salida RECORD;
    v_situaciones JSONB;
    v_ingresos JSONB;
    v_tripulacion JSONB;
    v_contadores RECORD;
    v_bitacora_id BIGINT;
BEGIN
    -- Obtener datos de la salida
    SELECT
        s.*,
        u.id as unidad_id_ref,
        s.fecha_hora_salida::DATE as fecha_jornada
    INTO v_salida
    FROM salida_unidad s
    JOIN unidad u ON s.unidad_id = u.id
    WHERE s.id = p_salida_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Salida no encontrada: %', p_salida_id;
    END IF;

    -- Obtener resumen de situaciones
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id,
        'tipo', tipo_situacion,
        'km', km,
        'hora', to_char(created_at, 'HH24:MI'),
        'estado', estado,
        'ruta_id', ruta_id
    ) ORDER BY created_at), '[]'::jsonb)
    INTO v_situaciones
    FROM situacion
    WHERE salida_unidad_id = p_salida_id;

    -- Obtener resumen de ingresos
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id,
        'tipo', tipo_ingreso,
        'sede_id', sede_id,
        'duracion_min', EXTRACT(EPOCH FROM (COALESCE(fecha_hora_salida, NOW()) - fecha_hora_ingreso))/60,
        'es_final', es_ingreso_final
    ) ORDER BY fecha_hora_ingreso), '[]'::jsonb)
    INTO v_ingresos
    FROM ingreso_sede
    WHERE salida_unidad_id = p_salida_id;

    -- Procesar tripulación - ES UN ARRAY JSONB
    -- Formato actual: [{"rol": "PILOTO", "brigada_id": 568, ...}, ...]
    -- Lo convertimos a: [{"usuario_id": X, "rol": "PILOTO"}, ...]
    SELECT COALESCE(
        jsonb_agg(jsonb_build_object(
            'usuario_id', (elem->>'brigada_id')::INTEGER,
            'rol', UPPER(elem->>'rol')
        )) FILTER (WHERE elem->>'brigada_id' IS NOT NULL),
        '[]'::jsonb
    )
    INTO v_tripulacion
    FROM jsonb_array_elements(COALESCE(v_salida.tripulacion, '[]'::jsonb)) elem;

    -- Calcular contadores
    SELECT
        COUNT(*) FILTER (WHERE tipo_situacion = 'INCIDENTE') as incidentes,
        COUNT(*) FILTER (WHERE tipo_situacion = 'ASISTENCIA') as asistencias,
        COUNT(*) FILTER (WHERE tipo_situacion = 'EMERGENCIA') as emergencias,
        COUNT(*) FILTER (WHERE tipo_situacion IN ('REGULACION', 'REGULACION_TRANSITO')) as regulaciones,
        COUNT(*) FILTER (WHERE tipo_situacion = 'PATRULLAJE') as patrullajes,
        COUNT(*) as total
    INTO v_contadores
    FROM situacion
    WHERE salida_unidad_id = p_salida_id;

    -- Insertar en bitacora_historica
    INSERT INTO bitacora_historica (
        fecha,
        unidad_id,
        salida_id,
        sede_origen_id,
        ruta_inicial_id,
        km_inicial,
        km_final,
        km_recorridos,
        combustible_inicial,
        combustible_final,
        hora_inicio,
        hora_fin,
        duracion_minutos,
        tripulacion_ids,
        situaciones_resumen,
        total_situaciones,
        ingresos_resumen,
        total_ingresos,
        total_incidentes,
        total_asistencias,
        total_emergencias,
        total_regulaciones,
        total_patrullajes,
        observaciones_inicio,
        observaciones_fin,
        finalizado_por
    ) VALUES (
        v_salida.fecha_jornada,
        v_salida.unidad_id,
        p_salida_id,
        v_salida.sede_origen_id,
        v_salida.ruta_inicial_id,
        v_salida.km_inicial,
        v_salida.km_final,
        v_salida.km_recorridos,
        v_salida.combustible_inicial,
        v_salida.combustible_final,
        v_salida.fecha_hora_salida,
        v_salida.fecha_hora_regreso,
        EXTRACT(EPOCH FROM (COALESCE(v_salida.fecha_hora_regreso, NOW()) - v_salida.fecha_hora_salida))/60,
        v_tripulacion,
        v_situaciones,
        v_contadores.total,
        v_ingresos,
        (SELECT COUNT(*) FROM ingreso_sede WHERE salida_unidad_id = p_salida_id),
        v_contadores.incidentes,
        v_contadores.asistencias,
        v_contadores.emergencias,
        v_contadores.regulaciones,
        v_contadores.patrullajes,
        v_salida.observaciones_salida,
        v_salida.observaciones_regreso,
        p_finalizado_por
    )
    ON CONFLICT (fecha, unidad_id)
    DO UPDATE SET
        -- Si ya existe, actualizar con datos más recientes
        salida_id = EXCLUDED.salida_id,
        km_final = EXCLUDED.km_final,
        km_recorridos = EXCLUDED.km_recorridos,
        combustible_final = EXCLUDED.combustible_final,
        hora_fin = EXCLUDED.hora_fin,
        duracion_minutos = EXCLUDED.duracion_minutos,
        situaciones_resumen = EXCLUDED.situaciones_resumen,
        total_situaciones = EXCLUDED.total_situaciones,
        ingresos_resumen = EXCLUDED.ingresos_resumen,
        total_ingresos = EXCLUDED.total_ingresos,
        total_incidentes = EXCLUDED.total_incidentes,
        total_asistencias = EXCLUDED.total_asistencias,
        total_emergencias = EXCLUDED.total_emergencias,
        total_regulaciones = EXCLUDED.total_regulaciones,
        total_patrullajes = EXCLUDED.total_patrullajes,
        observaciones_fin = EXCLUDED.observaciones_fin,
        finalizado_por = EXCLUDED.finalizado_por
    RETURNING id INTO v_bitacora_id;

    RETURN v_bitacora_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VISTA: Para consultas desde COP con datos expandidos
-- ============================================================================

CREATE OR REPLACE VIEW v_bitacora_historica_detalle AS
SELECT
    b.id,
    b.fecha,
    b.unidad_id,
    u.codigo as unidad_codigo,
    u.tipo_unidad,
    u.placa as unidad_placa,
    b.sede_origen_id,
    s.nombre as sede_nombre,
    b.ruta_inicial_id,
    r.codigo as ruta_codigo,
    r.nombre as ruta_nombre,
    b.km_inicial,
    b.km_final,
    b.km_recorridos,
    b.combustible_inicial,
    b.combustible_final,
    b.hora_inicio,
    b.hora_fin,
    b.duracion_minutos,
    -- Expandir tripulación para mostrar nombres
    (SELECT jsonb_agg(jsonb_build_object(
        'usuario_id', (t.value->>'usuario_id')::INTEGER,
        'rol', t.value->>'rol',
        'nombre', usr.nombre_completo,
        'chapa', usr.chapa
    ))
    FROM jsonb_array_elements(b.tripulacion_ids) t
    LEFT JOIN usuario usr ON (t.value->>'usuario_id')::INTEGER = usr.id
    ) as tripulacion_detalle,
    b.situaciones_resumen,
    b.total_situaciones,
    b.ingresos_resumen,
    b.total_ingresos,
    b.total_incidentes,
    b.total_asistencias,
    b.total_emergencias,
    b.total_regulaciones,
    b.total_patrullajes,
    b.observaciones_inicio,
    b.observaciones_fin,
    b.finalizado_por,
    fin.nombre_completo as finalizado_por_nombre,
    b.created_at
FROM bitacora_historica b
JOIN unidad u ON b.unidad_id = u.id
LEFT JOIN sede s ON b.sede_origen_id = s.id
LEFT JOIN ruta r ON b.ruta_inicial_id = r.id
LEFT JOIN usuario fin ON b.finalizado_por = fin.id;

-- ============================================================================
-- COMENTARIOS
-- ============================================================================

COMMENT ON TABLE bitacora_historica IS 'Tabla histórica optimizada para almacenar años de jornadas laborales finalizadas';
COMMENT ON COLUMN bitacora_historica.tripulacion_ids IS 'Array de referencias a usuarios, formato: [{"usuario_id": X, "rol": "PILOTO"}]';
COMMENT ON COLUMN bitacora_historica.situaciones_resumen IS 'Resumen compacto de situaciones del día, solo IDs y datos esenciales';
COMMENT ON COLUMN bitacora_historica.ingresos_resumen IS 'Resumen compacto de ingresos a sede del día';
COMMENT ON FUNCTION crear_snapshot_bitacora IS 'Crea un snapshot de la jornada en bitacora_historica antes de limpiar datos operacionales';

-- ============================================================================
-- GRANT DE PERMISOS (si es necesario)
-- ============================================================================
-- GRANT SELECT ON v_bitacora_historica_detalle TO app_user;
-- GRANT SELECT, INSERT, UPDATE ON bitacora_historica TO app_user;
