-- =====================================================
-- SISTEMA DE MOVIMIENTOS DE BRIGADAS Y SITUACIONES PERSISTENTES
-- =====================================================
-- Fecha: 2025-12-29
-- Descripción:
--   1. Préstamo de brigada: Un brigada se traslada de una unidad a otra
--   2. División de fuerza: Tripulación se divide (unos con unidad, otros en punto fijo)
--   3. Cambio de unidad: Tripulación completa cambia de unidad
--   4. Situaciones persistentes: Situaciones de larga duración donde múltiples unidades rotan

-- =====================================================
-- 1. UBICACIÓN ACTUAL DEL BRIGADA
-- =====================================================
-- Esta tabla rastrea DÓNDE está físicamente cada brigada en cada momento
-- Un brigada puede estar:
--   - CON_UNIDAD: Se mueve con la unidad física
--   - EN_PUNTO_FIJO: Está en una ubicación fija (no se mueve con la unidad)
--   - PRESTADO: Transferido temporalmente a otra unidad

CREATE TYPE estado_ubicacion_brigada AS ENUM (
    'CON_UNIDAD',      -- El brigada se mueve con la unidad (estado normal)
    'EN_PUNTO_FIJO',   -- El brigada está en un punto fijo, unidad se fue
    'PRESTADO'         -- El brigada fue prestado a otra unidad
);

CREATE TABLE ubicacion_brigada (
    id SERIAL PRIMARY KEY,

    -- Brigada
    usuario_id INTEGER NOT NULL REFERENCES usuario(id),

    -- Asignación original del turno
    asignacion_origen_id INTEGER NOT NULL REFERENCES asignacion_unidad(id),
    unidad_origen_id INTEGER NOT NULL REFERENCES unidad(id),

    -- Ubicación actual (puede ser diferente a la original)
    unidad_actual_id INTEGER REFERENCES unidad(id),  -- NULL si está en punto fijo sin unidad
    asignacion_actual_id INTEGER REFERENCES asignacion_unidad(id),  -- Asignación de la unidad actual

    -- Estado y ubicación
    estado estado_ubicacion_brigada NOT NULL DEFAULT 'CON_UNIDAD',

    -- Si está en punto fijo
    punto_fijo_km NUMERIC(6,2),
    punto_fijo_sentido VARCHAR(30),
    punto_fijo_ruta_id INTEGER REFERENCES ruta(id),
    punto_fijo_latitud NUMERIC(10,8),
    punto_fijo_longitud NUMERIC(11,8),
    punto_fijo_descripcion TEXT,

    -- Si está asignado a una situación persistente
    situacion_persistente_id INTEGER,  -- FK se agrega después de crear la tabla

    -- Timestamps
    inicio_ubicacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    fin_ubicacion TIMESTAMP WITH TIME ZONE,  -- NULL = ubicación actual activa

    -- Auditoría
    creado_por INTEGER REFERENCES usuario(id),
    motivo TEXT,  -- Motivo del movimiento

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_ubicacion_brigada_usuario ON ubicacion_brigada(usuario_id);
CREATE INDEX idx_ubicacion_brigada_activa ON ubicacion_brigada(usuario_id, fin_ubicacion) WHERE fin_ubicacion IS NULL;
CREATE INDEX idx_ubicacion_brigada_unidad_actual ON ubicacion_brigada(unidad_actual_id) WHERE fin_ubicacion IS NULL;
CREATE INDEX idx_ubicacion_brigada_origen ON ubicacion_brigada(unidad_origen_id);

-- =====================================================
-- 2. HISTORIAL DE MOVIMIENTOS (AUDITORÍA)
-- =====================================================
CREATE TYPE tipo_movimiento_brigada AS ENUM (
    'PRESTAMO',           -- Brigada prestado a otra unidad
    'RETORNO_PRESTAMO',   -- Brigada regresa de préstamo
    'DIVISION',           -- Brigada se queda en punto fijo, unidad se va
    'REUNION',            -- Brigada se reúne con su unidad
    'CAMBIO_UNIDAD',      -- Cambio completo de unidad (toda la tripulación)
    'ASIGNACION_SITUACION',   -- Asignado a situación persistente
    'DESASIGNACION_SITUACION' -- Desasignado de situación persistente
);

CREATE TABLE movimiento_brigada (
    id SERIAL PRIMARY KEY,

    -- Brigada(s) involucrados
    usuario_id INTEGER NOT NULL REFERENCES usuario(id),

    -- Tipo de movimiento
    tipo tipo_movimiento_brigada NOT NULL,

    -- Origen
    origen_unidad_id INTEGER REFERENCES unidad(id),
    origen_asignacion_id INTEGER REFERENCES asignacion_unidad(id),
    origen_km NUMERIC(6,2),
    origen_latitud NUMERIC(10,8),
    origen_longitud NUMERIC(11,8),

    -- Destino
    destino_unidad_id INTEGER REFERENCES unidad(id),
    destino_asignacion_id INTEGER REFERENCES asignacion_unidad(id),
    destino_km NUMERIC(6,2),
    destino_latitud NUMERIC(10,8),
    destino_longitud NUMERIC(11,8),

    -- Situación persistente (si aplica)
    situacion_persistente_id INTEGER,

    -- Metadata
    motivo TEXT,
    observaciones TEXT,

    -- Auditoría
    ejecutado_por INTEGER NOT NULL REFERENCES usuario(id),
    fecha_movimiento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_movimiento_brigada_usuario ON movimiento_brigada(usuario_id);
CREATE INDEX idx_movimiento_brigada_fecha ON movimiento_brigada(fecha_movimiento);
CREATE INDEX idx_movimiento_brigada_tipo ON movimiento_brigada(tipo);

-- =====================================================
-- 3. SITUACIONES PERSISTENTES
-- =====================================================
-- Situaciones de larga duración (días, semanas) que perduran
-- Múltiples unidades pueden ser asignadas/desasignadas

CREATE TYPE estado_situacion_persistente AS ENUM (
    'ACTIVA',       -- Situación en curso
    'EN_PAUSA',     -- Temporalmente sin atención
    'FINALIZADA'    -- Situación cerrada
);

CREATE TABLE situacion_persistente (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT uuid_generate_v4() UNIQUE,

    -- Identificación
    numero VARCHAR(50) UNIQUE,  -- Ej: SP-2025-001
    titulo VARCHAR(200) NOT NULL,

    -- Tipo (derrumbe, trabajos, accidente mayor, etc.)
    tipo VARCHAR(100) NOT NULL,
    subtipo VARCHAR(100),

    -- Estado
    estado estado_situacion_persistente NOT NULL DEFAULT 'ACTIVA',
    importancia VARCHAR(20) DEFAULT 'NORMAL',  -- BAJA, NORMAL, ALTA, CRITICA

    -- Ubicación
    ruta_id INTEGER REFERENCES ruta(id),
    km_inicio NUMERIC(6,2),
    km_fin NUMERIC(6,2),
    sentido VARCHAR(30),
    latitud NUMERIC(10,8),
    longitud NUMERIC(11,8),
    direccion_referencia TEXT,

    -- Descripción
    descripcion TEXT,
    observaciones_generales TEXT,

    -- Fechas
    fecha_inicio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    fecha_fin_estimada TIMESTAMP WITH TIME ZONE,
    fecha_fin_real TIMESTAMP WITH TIME ZONE,

    -- Auditoría
    creado_por INTEGER NOT NULL REFERENCES usuario(id),
    cerrado_por INTEGER REFERENCES usuario(id),

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Secuencia para número de situación persistente
CREATE SEQUENCE IF NOT EXISTS seq_situacion_persistente START 1;

CREATE INDEX idx_situacion_persistente_estado ON situacion_persistente(estado);
CREATE INDEX idx_situacion_persistente_ruta ON situacion_persistente(ruta_id);
CREATE INDEX idx_situacion_persistente_tipo ON situacion_persistente(tipo);

-- =====================================================
-- 4. ASIGNACIÓN DE UNIDADES A SITUACIONES PERSISTENTES
-- =====================================================
-- Rastrea qué unidades están/estuvieron asignadas a una situación persistente

CREATE TABLE asignacion_situacion_persistente (
    id SERIAL PRIMARY KEY,

    -- Situación y unidad
    situacion_persistente_id INTEGER NOT NULL REFERENCES situacion_persistente(id) ON DELETE CASCADE,
    unidad_id INTEGER NOT NULL REFERENCES unidad(id),
    asignacion_unidad_id INTEGER REFERENCES asignacion_unidad(id),  -- Asignación del turno

    -- Periodo de asignación
    fecha_hora_asignacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    fecha_hora_desasignacion TIMESTAMP WITH TIME ZONE,  -- NULL = actualmente asignada

    -- Ubicación al asignarse
    km_asignacion NUMERIC(6,2),
    latitud_asignacion NUMERIC(10,8),
    longitud_asignacion NUMERIC(11,8),

    -- Observaciones
    observaciones_asignacion TEXT,
    observaciones_desasignacion TEXT,

    -- Auditoría
    asignado_por INTEGER NOT NULL REFERENCES usuario(id),
    desasignado_por INTEGER REFERENCES usuario(id),

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Una unidad no puede estar asignada dos veces a la misma situación simultáneamente
    CONSTRAINT uk_asignacion_activa UNIQUE (situacion_persistente_id, unidad_id, fecha_hora_desasignacion)
);

CREATE INDEX idx_asig_sit_pers_situacion ON asignacion_situacion_persistente(situacion_persistente_id);
CREATE INDEX idx_asig_sit_pers_unidad ON asignacion_situacion_persistente(unidad_id);
CREATE INDEX idx_asig_sit_pers_activa ON asignacion_situacion_persistente(situacion_persistente_id, fecha_hora_desasignacion)
    WHERE fecha_hora_desasignacion IS NULL;

-- =====================================================
-- 5. ACTUALIZACIONES DE SITUACIONES PERSISTENTES
-- =====================================================
-- Registra toda la información agregada por unidades a una situación persistente

CREATE TABLE actualizacion_situacion_persistente (
    id SERIAL PRIMARY KEY,

    -- Situación
    situacion_persistente_id INTEGER NOT NULL REFERENCES situacion_persistente(id) ON DELETE CASCADE,

    -- Quién agregó la información
    usuario_id INTEGER NOT NULL REFERENCES usuario(id),
    unidad_id INTEGER NOT NULL REFERENCES unidad(id),
    asignacion_situacion_id INTEGER REFERENCES asignacion_situacion_persistente(id),

    -- Contenido
    tipo_actualizacion VARCHAR(50) NOT NULL,  -- OBSERVACION, FOTO, NOVEDAD, CAMBIO_ESTADO, etc.
    contenido TEXT,
    datos_adicionales JSONB,  -- Para datos estructurados

    -- Archivos adjuntos (URLs o referencias)
    archivos JSONB,

    -- Auditoría
    fecha_hora TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    editado BOOLEAN DEFAULT FALSE,
    fecha_ultima_edicion TIMESTAMP WITH TIME ZONE,
    editado_por INTEGER REFERENCES usuario(id),

    -- Restricción: solo editable mientras esté asignado
    puede_editarse BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_actualizacion_sit_pers ON actualizacion_situacion_persistente(situacion_persistente_id);
CREATE INDEX idx_actualizacion_sit_usuario ON actualizacion_situacion_persistente(usuario_id);
CREATE INDEX idx_actualizacion_sit_unidad ON actualizacion_situacion_persistente(unidad_id);
CREATE INDEX idx_actualizacion_sit_fecha ON actualizacion_situacion_persistente(fecha_hora);

-- =====================================================
-- 6. AGREGAR FK A ubicacion_brigada
-- =====================================================
ALTER TABLE ubicacion_brigada
    ADD CONSTRAINT fk_ubicacion_brigada_situacion
    FOREIGN KEY (situacion_persistente_id)
    REFERENCES situacion_persistente(id) ON DELETE SET NULL;

ALTER TABLE movimiento_brigada
    ADD CONSTRAINT fk_movimiento_brigada_situacion
    FOREIGN KEY (situacion_persistente_id)
    REFERENCES situacion_persistente(id) ON DELETE SET NULL;

-- =====================================================
-- 7. VISTA: UBICACIÓN ACTUAL DE CADA BRIGADA
-- =====================================================
CREATE OR REPLACE VIEW v_ubicacion_actual_brigada AS
SELECT
    ub.usuario_id,
    u.nombre_completo,
    u.username,

    -- Ubicación actual
    ub.estado,
    ub.unidad_actual_id,
    ua.codigo AS unidad_actual_codigo,
    ub.unidad_origen_id,
    uo.codigo AS unidad_origen_codigo,

    -- Si está en punto fijo
    ub.punto_fijo_km,
    ub.punto_fijo_sentido,
    ub.punto_fijo_ruta_id,
    r.codigo AS punto_fijo_ruta_codigo,
    ub.punto_fijo_latitud,
    ub.punto_fijo_longitud,
    ub.punto_fijo_descripcion,

    -- Si está en situación persistente
    ub.situacion_persistente_id,
    sp.titulo AS situacion_persistente_titulo,
    sp.tipo AS situacion_persistente_tipo,

    -- Timestamps
    ub.inicio_ubicacion,
    ub.motivo,
    ub.created_at

FROM ubicacion_brigada ub
JOIN usuario u ON ub.usuario_id = u.id
LEFT JOIN unidad ua ON ub.unidad_actual_id = ua.id
LEFT JOIN unidad uo ON ub.unidad_origen_id = uo.id
LEFT JOIN ruta r ON ub.punto_fijo_ruta_id = r.id
LEFT JOIN situacion_persistente sp ON ub.situacion_persistente_id = sp.id
WHERE ub.fin_ubicacion IS NULL;  -- Solo ubicaciones activas

-- =====================================================
-- 8. VISTA: SITUACIONES PERSISTENTES CON UNIDADES ASIGNADAS
-- =====================================================
CREATE OR REPLACE VIEW v_situaciones_persistentes_completas AS
SELECT
    sp.*,
    r.codigo AS ruta_codigo,
    r.nombre AS ruta_nombre,
    uc.nombre_completo AS creado_por_nombre,
    ucerr.nombre_completo AS cerrado_por_nombre,

    -- Contar unidades asignadas actualmente
    (SELECT COUNT(*) FROM asignacion_situacion_persistente asp
     WHERE asp.situacion_persistente_id = sp.id
     AND asp.fecha_hora_desasignacion IS NULL) AS unidades_asignadas_count,

    -- Lista de unidades asignadas actualmente
    (SELECT json_agg(json_build_object(
        'unidad_id', u.id,
        'unidad_codigo', u.codigo,
        'fecha_asignacion', asp.fecha_hora_asignacion
    ))
    FROM asignacion_situacion_persistente asp
    JOIN unidad u ON asp.unidad_id = u.id
    WHERE asp.situacion_persistente_id = sp.id
    AND asp.fecha_hora_desasignacion IS NULL) AS unidades_asignadas

FROM situacion_persistente sp
LEFT JOIN ruta r ON sp.ruta_id = r.id
LEFT JOIN usuario uc ON sp.creado_por = uc.id
LEFT JOIN usuario ucerr ON sp.cerrado_por = ucerr.id;

-- =====================================================
-- 9. FUNCIÓN: Inicializar ubicación de brigada al iniciar salida
-- =====================================================
CREATE OR REPLACE FUNCTION fn_inicializar_ubicacion_brigada()
RETURNS TRIGGER AS $$
BEGIN
    -- Cuando se agrega un tripulante a una asignación, crear su registro de ubicación
    INSERT INTO ubicacion_brigada (
        usuario_id,
        asignacion_origen_id,
        unidad_origen_id,
        unidad_actual_id,
        asignacion_actual_id,
        estado,
        creado_por
    )
    SELECT
        NEW.usuario_id,
        NEW.asignacion_id,
        a.unidad_id,
        a.unidad_id,
        NEW.asignacion_id,
        'CON_UNIDAD',
        NEW.usuario_id
    FROM asignacion_unidad a
    WHERE a.id = NEW.asignacion_id
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger (comentado por ahora, activar cuando se implemente completamente)
-- CREATE TRIGGER trg_inicializar_ubicacion_brigada
-- AFTER INSERT ON tripulacion_turno
-- FOR EACH ROW EXECUTE FUNCTION fn_inicializar_ubicacion_brigada();

-- =====================================================
-- 10. FUNCIÓN: Generar número de situación persistente
-- =====================================================
CREATE OR REPLACE FUNCTION fn_generar_numero_situacion_persistente()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.numero IS NULL THEN
        NEW.numero := 'SP-' || EXTRACT(YEAR FROM NOW()) || '-' ||
                      LPAD(nextval('seq_situacion_persistente')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_numero_situacion_persistente
BEFORE INSERT ON situacion_persistente
FOR EACH ROW EXECUTE FUNCTION fn_generar_numero_situacion_persistente();

-- =====================================================
-- COMENTARIOS
-- =====================================================
COMMENT ON TABLE ubicacion_brigada IS 'Rastrea la ubicación física actual de cada brigada. Permite préstamos, divisiones y cambios de unidad.';
COMMENT ON TABLE movimiento_brigada IS 'Historial de todos los movimientos de brigadas entre unidades.';
COMMENT ON TABLE situacion_persistente IS 'Situaciones de larga duración (días/semanas) como derrumbes, obras, etc.';
COMMENT ON TABLE asignacion_situacion_persistente IS 'Rastrea qué unidades están/estuvieron asignadas a situaciones persistentes.';
COMMENT ON TABLE actualizacion_situacion_persistente IS 'Información agregada por unidades a situaciones persistentes.';
