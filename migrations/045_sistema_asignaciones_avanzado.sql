-- =====================================================
-- MIGRACIÓN 045: Sistema de Asignaciones Avanzado
-- =====================================================
-- Incluye:
-- 1. Personalización visual por sede (colores, tipografía)
-- 2. Sistema de borradores (asignaciones no publicadas)
-- 3. Situaciones fijas/recurrentes
-- 4. Alertas de rotación (rutas y situaciones)
-- 5. Formato rico en acciones (HTML básico)
-- =====================================================

-- 1. PERSONALIZACIÓN VISUAL POR SEDE
-- =====================================================
CREATE TABLE IF NOT EXISTS configuracion_visual_sede (
    id SERIAL PRIMARY KEY,
    sede_id INTEGER NOT NULL REFERENCES sede(id) ON DELETE CASCADE,

    -- Colores (hex)
    color_fondo VARCHAR(7) DEFAULT '#ffffff',
    color_fondo_header VARCHAR(7) DEFAULT '#f3f4f6',
    color_texto VARCHAR(7) DEFAULT '#1f2937',
    color_acento VARCHAR(7) DEFAULT '#3b82f6',

    -- Tipografía
    fuente VARCHAR(50) DEFAULT 'Inter',
    tamano_fuente VARCHAR(10) DEFAULT 'normal', -- 'small', 'normal', 'large'

    -- Configuración de alertas
    alerta_rotacion_rutas_activa BOOLEAN DEFAULT true,
    umbral_rotacion_rutas INTEGER DEFAULT 3, -- Veces en la misma ruta antes de alertar

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(sede_id)
);

CREATE INDEX idx_config_visual_sede ON configuracion_visual_sede(sede_id);

-- Trigger para updated_at
CREATE TRIGGER update_config_visual_sede_updated_at
    BEFORE UPDATE ON configuracion_visual_sede
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. SISTEMA DE BORRADORES EN TURNO
-- =====================================================
-- Agregar columna para estado de publicación
ALTER TABLE turno ADD COLUMN IF NOT EXISTS publicado BOOLEAN DEFAULT false;
ALTER TABLE turno ADD COLUMN IF NOT EXISTS fecha_publicacion TIMESTAMPTZ;
ALTER TABLE turno ADD COLUMN IF NOT EXISTS publicado_por INTEGER REFERENCES usuario(id);

-- Agregar sede_id a turno para agrupar por sede
ALTER TABLE turno ADD COLUMN IF NOT EXISTS sede_id INTEGER REFERENCES sede(id);

-- Índice para buscar turnos por sede
CREATE INDEX IF NOT EXISTS idx_turno_sede ON turno(sede_id);
CREATE INDEX IF NOT EXISTS idx_turno_publicado ON turno(publicado, fecha);

-- 3. SITUACIONES FIJAS/RECURRENTES
-- =====================================================
CREATE TABLE IF NOT EXISTS situacion_fija (
    id SERIAL PRIMARY KEY,
    sede_id INTEGER NOT NULL REFERENCES sede(id) ON DELETE CASCADE,

    -- Información de la situación
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(50) NOT NULL, -- 'AMPLIACION_CARRIL', 'OBRA', 'EVENTO', 'REGULACION', 'OTRO'

    -- Ubicación
    ruta_id INTEGER REFERENCES ruta(id),
    km_inicio DECIMAL(10,2),
    km_fin DECIMAL(10,2),
    punto_referencia TEXT,

    -- Horarios
    hora_inicio TIME,
    hora_fin TIME,
    dias_semana VARCHAR(20)[], -- ['LUNES', 'MARTES', ...]

    -- Vigencia
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE, -- NULL = indefinido
    activa BOOLEAN DEFAULT true,

    -- Detalles adicionales
    observaciones TEXT,
    puntos_destacar TEXT, -- Formato rico (HTML básico)
    requiere_unidad_especifica BOOLEAN DEFAULT false,
    unidad_tipo_requerido VARCHAR(50), -- 'PICK-UP', 'AMBULANCIA', etc.

    -- Auditoría
    creado_por INTEGER NOT NULL REFERENCES usuario(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_situacion_fija_sede ON situacion_fija(sede_id);
CREATE INDEX idx_situacion_fija_activa ON situacion_fija(activa, fecha_inicio, fecha_fin);
CREATE INDEX idx_situacion_fija_ruta ON situacion_fija(ruta_id);

CREATE TRIGGER update_situacion_fija_updated_at
    BEFORE UPDATE ON situacion_fija
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. VINCULACIÓN DE ASIGNACIÓN CON SITUACIÓN FIJA
-- =====================================================
ALTER TABLE asignacion_unidad ADD COLUMN IF NOT EXISTS situacion_fija_id INTEGER REFERENCES situacion_fija(id);
CREATE INDEX IF NOT EXISTS idx_asignacion_situacion_fija ON asignacion_unidad(situacion_fija_id);

-- 5. FORMATO RICO EN ACCIONES
-- =====================================================
-- Agregar campo para acciones con formato (HTML básico)
ALTER TABLE asignacion_unidad ADD COLUMN IF NOT EXISTS acciones_formato TEXT;
-- El campo 'acciones' existente se mantiene como texto plano para compatibilidad
-- 'acciones_formato' permite HTML básico: <b>, <span style="color:red">, etc.

-- 6. HISTORIAL DE RUTAS POR BRIGADA (para alertas de rotación)
-- =====================================================
CREATE TABLE IF NOT EXISTS historial_ruta_brigada (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    ruta_id INTEGER NOT NULL REFERENCES ruta(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    turno_id INTEGER REFERENCES turno(id) ON DELETE SET NULL,
    asignacion_id INTEGER REFERENCES asignacion_unidad(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_historial_ruta_brigada_usuario ON historial_ruta_brigada(usuario_id, fecha DESC);
CREATE INDEX idx_historial_ruta_brigada_ruta ON historial_ruta_brigada(ruta_id, usuario_id);

-- 7. HISTORIAL DE SITUACIONES FIJAS POR BRIGADA (para alertas)
-- =====================================================
CREATE TABLE IF NOT EXISTS historial_situacion_brigada (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    situacion_fija_id INTEGER NOT NULL REFERENCES situacion_fija(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    turno_id INTEGER REFERENCES turno(id) ON DELETE SET NULL,
    asignacion_id INTEGER REFERENCES asignacion_unidad(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_historial_situacion_brigada_usuario ON historial_situacion_brigada(usuario_id, fecha DESC);
CREATE INDEX idx_historial_situacion_brigada_situacion ON historial_situacion_brigada(situacion_fija_id, usuario_id);

-- 8. ADVERTENCIAS/AVISOS EN ASIGNACIONES
-- =====================================================
CREATE TABLE IF NOT EXISTS aviso_asignacion (
    id SERIAL PRIMARY KEY,
    asignacion_id INTEGER NOT NULL REFERENCES asignacion_unidad(id) ON DELETE CASCADE,

    tipo VARCHAR(30) NOT NULL, -- 'ADVERTENCIA', 'INFO', 'URGENTE'
    mensaje TEXT NOT NULL,
    color VARCHAR(7) DEFAULT '#f59e0b', -- Amarillo por defecto

    creado_por INTEGER NOT NULL REFERENCES usuario(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_aviso_asignacion ON aviso_asignacion(asignacion_id);

-- 9. FUNCIÓN PARA CONTAR VECES EN RUTA (últimos N días)
-- =====================================================
CREATE OR REPLACE FUNCTION contar_veces_en_ruta(
    p_usuario_id INTEGER,
    p_ruta_id INTEGER,
    p_dias INTEGER DEFAULT 30
) RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM historial_ruta_brigada
    WHERE usuario_id = p_usuario_id
      AND ruta_id = p_ruta_id
      AND fecha >= CURRENT_DATE - p_dias;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 10. FUNCIÓN PARA CONTAR VECES EN SITUACIÓN FIJA (últimos N días)
-- =====================================================
CREATE OR REPLACE FUNCTION contar_veces_en_situacion(
    p_usuario_id INTEGER,
    p_situacion_fija_id INTEGER,
    p_dias INTEGER DEFAULT 30
) RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM historial_situacion_brigada
    WHERE usuario_id = p_usuario_id
      AND situacion_fija_id = p_situacion_fija_id
      AND fecha >= CURRENT_DATE - p_dias;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 11. VISTA PARA ASIGNACIONES AGRUPADAS POR SEDE
-- =====================================================
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

    -- Quien creó el turno
    t.creado_por,
    uc.nombre_completo as creado_por_nombre,

    -- Configuración visual
    cv.color_fondo,
    cv.color_fondo_header,
    cv.color_texto,
    cv.color_acento,
    cv.fuente,
    cv.tamano_fuente,
    cv.alerta_rotacion_rutas_activa,
    cv.umbral_rotacion_rutas,

    -- Asignación
    au.id as asignacion_id,
    au.unidad_id,
    u.codigo as unidad_codigo,
    u.tipo_unidad,
    u.placa as unidad_placa,

    -- Ruta
    au.ruta_id,
    r.codigo as ruta_codigo,
    r.nombre as ruta_nombre,
    au.km_inicio,
    au.km_final,
    au.sentido,

    -- Acciones
    au.acciones,
    au.acciones_formato,
    au.hora_salida,

    -- Situación fija
    au.situacion_fija_id,
    sf.titulo as situacion_fija_titulo,
    sf.tipo as situacion_fija_tipo,

    -- Estado
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

-- 12. INSERTAR CONFIGURACIÓN VISUAL POR DEFECTO PARA SEDES EXISTENTES
-- =====================================================
INSERT INTO configuracion_visual_sede (sede_id, color_fondo, color_fondo_header, color_acento)
SELECT id,
    CASE id
        WHEN 1 THEN '#f0fdf4' -- Central - Verde claro
        WHEN 2 THEN '#fef3c7' -- Mazatenango - Amarillo claro
        WHEN 3 THEN '#fce7f3' -- Poptún - Rosa claro
        WHEN 4 THEN '#e0e7ff' -- San Cristóbal - Índigo claro
        WHEN 5 THEN '#dbeafe' -- Quetzaltenango - Azul claro
        WHEN 6 THEN '#ffedd5' -- Coatepeque - Naranja claro
        WHEN 7 THEN '#f3e8ff' -- Palín - Púrpura claro
        WHEN 8 THEN '#dcfce7' -- Morales - Verde menta
        WHEN 9 THEN '#e0f2fe' -- Río Dulce - Cyan claro
        ELSE '#ffffff'
    END,
    CASE id
        WHEN 1 THEN '#dcfce7'
        WHEN 2 THEN '#fde68a'
        WHEN 3 THEN '#fbcfe8'
        WHEN 4 THEN '#c7d2fe'
        WHEN 5 THEN '#bfdbfe'
        WHEN 6 THEN '#fed7aa'
        WHEN 7 THEN '#e9d5ff'
        WHEN 8 THEN '#bbf7d0'
        WHEN 9 THEN '#bae6fd'
        ELSE '#f3f4f6'
    END,
    CASE id
        WHEN 1 THEN '#22c55e'
        WHEN 2 THEN '#eab308'
        WHEN 3 THEN '#ec4899'
        WHEN 4 THEN '#6366f1'
        WHEN 5 THEN '#3b82f6'
        WHEN 6 THEN '#f97316'
        WHEN 7 THEN '#a855f7'
        WHEN 8 THEN '#10b981'
        WHEN 9 THEN '#0ea5e9'
        ELSE '#3b82f6'
    END
FROM sede
ON CONFLICT (sede_id) DO NOTHING;

-- 13. COMENTARIOS
-- =====================================================
COMMENT ON TABLE configuracion_visual_sede IS 'Personalización visual del dashboard por sede';
COMMENT ON TABLE situacion_fija IS 'Situaciones recurrentes que se asignan frecuentemente (ej: ampliación de carril)';
COMMENT ON TABLE historial_ruta_brigada IS 'Historial para alertas de rotación de rutas';
COMMENT ON TABLE historial_situacion_brigada IS 'Historial para alertas de rotación de situaciones';
COMMENT ON TABLE aviso_asignacion IS 'Avisos/advertencias especiales en asignaciones';
COMMENT ON COLUMN turno.publicado IS 'Si false, la asignación está en borrador y no es visible para brigadas';
COMMENT ON COLUMN asignacion_unidad.acciones_formato IS 'Acciones con formato HTML básico (negrita, colores)';
