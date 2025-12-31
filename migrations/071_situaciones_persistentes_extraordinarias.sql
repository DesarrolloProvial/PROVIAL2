-- =====================================================
-- MIGRACION 071: SISTEMA DE SITUACIONES PERSISTENTES EXTRAORDINARIAS
-- =====================================================
-- Fecha: 2025-12-30
-- Descripcion:
--   1. Sistema de sub-roles COP (adminCOP, encargado_isla, etc.)
--   2. Catalogo de tipos de emergencia vial
--   3. Ampliar tabla situacion_persistente con campos de emergencia
--   4. Tablas de obstruccion, autoridades, socorro y multimedia
--   5. Funcion de promocion de situacion normal a persistente
-- =====================================================

BEGIN;

-- =====================================================
-- 1. SUB-ROLES COP
-- =====================================================
-- Permite diferenciar permisos dentro del rol COP:
-- - ADMIN_COP: Acceso total
-- - ENCARGADO_ISLA: Puede crear/cerrar persistentes
-- - SUB_ENCARGADO_ISLA: Puede crear/cerrar persistentes
-- - OPERADOR: Solo lectura

CREATE TABLE IF NOT EXISTS sub_rol_cop (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(30) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    puede_crear_persistentes BOOLEAN NOT NULL DEFAULT FALSE,
    puede_cerrar_persistentes BOOLEAN NOT NULL DEFAULT FALSE,
    puede_promover_situaciones BOOLEAN NOT NULL DEFAULT FALSE,
    puede_asignar_unidades BOOLEAN NOT NULL DEFAULT TRUE,
    solo_lectura BOOLEAN NOT NULL DEFAULT FALSE,
    permisos JSONB DEFAULT '{}',
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insertar sub-roles iniciales
INSERT INTO sub_rol_cop (codigo, nombre, descripcion, puede_crear_persistentes, puede_cerrar_persistentes, puede_promover_situaciones, puede_asignar_unidades, solo_lectura) VALUES
('ADMIN_COP', 'Administrador COP', 'Acceso total al Centro de Operaciones', TRUE, TRUE, TRUE, TRUE, FALSE),
('ENCARGADO_ISLA', 'Encargado de Isla', 'Responsable de una isla del COP, puede gestionar situaciones persistentes', TRUE, TRUE, TRUE, TRUE, FALSE),
('SUB_ENCARGADO_ISLA', 'Sub-Encargado de Isla', 'Asistente del encargado de isla, puede gestionar situaciones persistentes', TRUE, TRUE, TRUE, TRUE, FALSE),
('OPERADOR', 'Operador', 'Operador del COP, solo puede visualizar y monitorear', FALSE, FALSE, FALSE, FALSE, TRUE)
ON CONFLICT (codigo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    puede_crear_persistentes = EXCLUDED.puede_crear_persistentes,
    puede_cerrar_persistentes = EXCLUDED.puede_cerrar_persistentes,
    puede_promover_situaciones = EXCLUDED.puede_promover_situaciones,
    puede_asignar_unidades = EXCLUDED.puede_asignar_unidades,
    solo_lectura = EXCLUDED.solo_lectura;

-- Agregar columna sub_rol_cop_id a usuario (si no existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'usuario' AND column_name = 'sub_rol_cop_id'
    ) THEN
        ALTER TABLE usuario ADD COLUMN sub_rol_cop_id INTEGER REFERENCES sub_rol_cop(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_usuario_sub_rol_cop ON usuario(sub_rol_cop_id);

COMMENT ON TABLE sub_rol_cop IS 'Sub-roles para usuarios COP: adminCOP, encargado_isla, sub_encargado_isla, operador';
COMMENT ON COLUMN sub_rol_cop.puede_crear_persistentes IS 'Puede crear situaciones persistentes extraordinarias';
COMMENT ON COLUMN sub_rol_cop.puede_promover_situaciones IS 'Puede promover una situacion normal a persistente';
COMMENT ON COLUMN sub_rol_cop.solo_lectura IS 'Solo puede visualizar, no puede realizar acciones';

-- =====================================================
-- 2. CATALOGO DE TIPOS DE EMERGENCIA VIAL
-- =====================================================
-- Los 12 tipos de emergencia vial del formulario movil

CREATE TABLE IF NOT EXISTS tipo_emergencia_vial (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    icono VARCHAR(50),
    color VARCHAR(20) DEFAULT '#EF4444',
    activo BOOLEAN DEFAULT TRUE,
    orden INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insertar tipos de emergencia
INSERT INTO tipo_emergencia_vial (codigo, nombre, orden) VALUES
('ACUMULACION_AGUA', 'Acumulacion de Agua', 1),
('CAIDA_ARBOL', 'Caida de Arbol', 2),
('CAIDA_PUENTE', 'Caida de Puente', 3),
('CAIDA_VALLA', 'Caida de Valla Publicitaria', 4),
('DERRUMBE', 'Derrumbe', 5),
('DESBORDAMIENTO_RIO', 'Desbordamiento de Rio', 6),
('DESLAVE', 'Deslave', 7),
('DESPRENDIMIENTO_ROCAS', 'Desprendimiento de Rocas', 8),
('HUNDIMIENTO', 'Hundimiento', 9),
('INCENDIO_FORESTAL', 'Incendio Forestal', 10),
('SOCAVAMIENTO', 'Socavamiento', 11),
('APOYO_ANTORCHA', 'Apoyo Antorcha', 12),
('OTRO', 'Otro', 99)
ON CONFLICT (codigo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    orden = EXCLUDED.orden;

COMMENT ON TABLE tipo_emergencia_vial IS 'Catalogo de tipos de emergencias viales para situaciones persistentes';

-- =====================================================
-- 3. AMPLIAR TABLA SITUACION_PERSISTENTE
-- =====================================================
-- Agregar campos de emergencia vial y vinculo con situacion original

-- Agregar columna tipo_emergencia_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'situacion_persistente' AND column_name = 'tipo_emergencia_id'
    ) THEN
        ALTER TABLE situacion_persistente ADD COLUMN tipo_emergencia_id INTEGER REFERENCES tipo_emergencia_vial(id);
    END IF;
END $$;

-- Agregar columna situacion_origen_id (para promociones)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'situacion_persistente' AND column_name = 'situacion_origen_id'
    ) THEN
        ALTER TABLE situacion_persistente ADD COLUMN situacion_origen_id INTEGER REFERENCES situacion(id);
    END IF;
END $$;

-- Agregar columna es_promocion
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'situacion_persistente' AND column_name = 'es_promocion'
    ) THEN
        ALTER TABLE situacion_persistente ADD COLUMN es_promocion BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Agregar columna fecha_promocion
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'situacion_persistente' AND column_name = 'fecha_promocion'
    ) THEN
        ALTER TABLE situacion_persistente ADD COLUMN fecha_promocion TIMESTAMPTZ;
    END IF;
END $$;

-- Agregar columna promovido_por
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'situacion_persistente' AND column_name = 'promovido_por'
    ) THEN
        ALTER TABLE situacion_persistente ADD COLUMN promovido_por INTEGER REFERENCES usuario(id);
    END IF;
END $$;

-- Agregar columna jurisdiccion
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'situacion_persistente' AND column_name = 'jurisdiccion'
    ) THEN
        ALTER TABLE situacion_persistente ADD COLUMN jurisdiccion TEXT;
    END IF;
END $$;

-- Indices adicionales
CREATE INDEX IF NOT EXISTS idx_sit_pers_tipo_emergencia ON situacion_persistente(tipo_emergencia_id);
CREATE INDEX IF NOT EXISTS idx_sit_pers_situacion_origen ON situacion_persistente(situacion_origen_id);
CREATE INDEX IF NOT EXISTS idx_sit_pers_es_promocion ON situacion_persistente(es_promocion);

-- =====================================================
-- 4. TABLA OBSTRUCCION SITUACION PERSISTENTE
-- =====================================================
-- Almacena datos de obstruccion de via para situaciones persistentes

CREATE TABLE IF NOT EXISTS obstruccion_situacion_persistente (
    id SERIAL PRIMARY KEY,
    situacion_persistente_id INTEGER NOT NULL REFERENCES situacion_persistente(id) ON DELETE CASCADE,
    obstruye_via BOOLEAN NOT NULL DEFAULT FALSE,
    tipo_obstruccion VARCHAR(20) CHECK (tipo_obstruccion IS NULL OR tipo_obstruccion IN ('fuera', 'parcial', 'total')),
    carriles_afectados TEXT,
    porcentaje_obstruccion INTEGER CHECK (porcentaje_obstruccion IS NULL OR porcentaje_obstruccion IN (25, 50, 75, 100)),
    descripcion_manual TEXT,
    descripcion_generada TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(situacion_persistente_id) -- Solo una obstruccion por situacion
);

CREATE INDEX IF NOT EXISTS idx_obstruccion_sit_pers ON obstruccion_situacion_persistente(situacion_persistente_id);

COMMENT ON TABLE obstruccion_situacion_persistente IS 'Datos de obstruccion de via para situaciones persistentes';
COMMENT ON COLUMN obstruccion_situacion_persistente.tipo_obstruccion IS 'fuera=vehiculo fuera de via, parcial=obstruccion parcial, total=via cerrada';

-- =====================================================
-- 5. TABLA AUTORIDADES EN SITUACION PERSISTENTE
-- =====================================================
-- PMT, PNC, PROVIAL, DGT, Ejercito, MP, COVIAL, Caminos, PNC DT, PM

CREATE TABLE IF NOT EXISTS autoridad_situacion_persistente (
    id SERIAL PRIMARY KEY,
    situacion_persistente_id INTEGER NOT NULL REFERENCES situacion_persistente(id) ON DELETE CASCADE,
    tipo_autoridad VARCHAR(50) NOT NULL,
    hora_llegada TIME,
    nip_chapa VARCHAR(50),
    numero_unidad VARCHAR(50),
    nombre_comandante VARCHAR(150),
    cantidad_elementos INTEGER,
    subestacion VARCHAR(100),
    cantidad_unidades INTEGER,
    observaciones TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_autoridad_sit_pers ON autoridad_situacion_persistente(situacion_persistente_id);
CREATE INDEX IF NOT EXISTS idx_autoridad_sit_pers_tipo ON autoridad_situacion_persistente(situacion_persistente_id, tipo_autoridad);

COMMENT ON TABLE autoridad_situacion_persistente IS 'Autoridades presentes en situaciones persistentes (PMT, PNC, DGT, etc.)';

-- =====================================================
-- 6. TABLA SOCORRO EN SITUACION PERSISTENTE
-- =====================================================
-- Bomberos Voluntarios, Bomberos Municipales, CONRED, Cruz Roja, Bomberos Departamentales

CREATE TABLE IF NOT EXISTS socorro_situacion_persistente (
    id SERIAL PRIMARY KEY,
    situacion_persistente_id INTEGER NOT NULL REFERENCES situacion_persistente(id) ON DELETE CASCADE,
    tipo_socorro VARCHAR(50) NOT NULL,
    hora_llegada TIME,
    nip_chapa VARCHAR(50),
    numero_unidad VARCHAR(50),
    nombre_comandante VARCHAR(150),
    cantidad_elementos INTEGER,
    subestacion VARCHAR(100),
    cantidad_unidades INTEGER,
    observaciones TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_socorro_sit_pers ON socorro_situacion_persistente(situacion_persistente_id);
CREATE INDEX IF NOT EXISTS idx_socorro_sit_pers_tipo ON socorro_situacion_persistente(situacion_persistente_id, tipo_socorro);

COMMENT ON TABLE socorro_situacion_persistente IS 'Unidades de socorro en situaciones persistentes (Bomberos, Cruz Roja, CONRED)';

-- =====================================================
-- 7. TABLA MULTIMEDIA SITUACION PERSISTENTE
-- =====================================================
-- 3 fotos + 1 video por situacion

CREATE TABLE IF NOT EXISTS multimedia_situacion_persistente (
    id SERIAL PRIMARY KEY,
    situacion_persistente_id INTEGER NOT NULL REFERENCES situacion_persistente(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('foto', 'video')),
    url TEXT NOT NULL,
    url_thumbnail TEXT,
    nombre_archivo VARCHAR(255),
    mime_type VARCHAR(100),
    tamanio_bytes BIGINT,
    ancho INTEGER,
    alto INTEGER,
    duracion_segundos INTEGER, -- Solo para videos
    orden INTEGER DEFAULT 0,
    latitud NUMERIC(10, 8),
    longitud NUMERIC(11, 8),
    descripcion TEXT,
    subido_por INTEGER NOT NULL REFERENCES usuario(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_multimedia_sit_pers ON multimedia_situacion_persistente(situacion_persistente_id);
CREATE INDEX IF NOT EXISTS idx_multimedia_sit_pers_tipo ON multimedia_situacion_persistente(situacion_persistente_id, tipo);

COMMENT ON TABLE multimedia_situacion_persistente IS 'Fotos y videos de situaciones persistentes (3 fotos + 1 video requeridos)';

-- =====================================================
-- 8. VISTA COMPLETA DE SITUACIONES PERSISTENTES
-- =====================================================

DROP VIEW IF EXISTS v_situaciones_persistentes_completas CASCADE;

CREATE OR REPLACE VIEW v_situaciones_persistentes_completas AS
SELECT
    sp.*,
    r.codigo AS ruta_codigo,
    r.nombre AS ruta_nombre,
    tev.nombre AS tipo_emergencia_nombre,
    tev.codigo AS tipo_emergencia_codigo,
    tev.color AS tipo_emergencia_color,
    uc.nombre_completo AS creado_por_nombre,
    ucerr.nombre_completo AS cerrado_por_nombre,
    uprom.nombre_completo AS promovido_por_nombre,
    so.uuid AS situacion_origen_uuid,
    so.numero_situacion AS situacion_origen_numero,

    -- Contar unidades asignadas actualmente
    (SELECT COUNT(*) FROM asignacion_situacion_persistente asp
     WHERE asp.situacion_persistente_id = sp.id
     AND asp.fecha_hora_desasignacion IS NULL) AS unidades_asignadas_count,

    -- Lista de unidades asignadas actualmente
    (SELECT json_agg(json_build_object(
        'unidad_id', u.id,
        'unidad_codigo', u.codigo,
        'tipo_unidad', u.tipo_unidad,
        'fecha_asignacion', asp.fecha_hora_asignacion
    ))
    FROM asignacion_situacion_persistente asp
    JOIN unidad u ON asp.unidad_id = u.id
    WHERE asp.situacion_persistente_id = sp.id
    AND asp.fecha_hora_desasignacion IS NULL) AS unidades_asignadas,

    -- Datos de obstruccion
    (SELECT json_build_object(
        'id', osp.id,
        'obstruye_via', osp.obstruye_via,
        'tipo_obstruccion', osp.tipo_obstruccion,
        'carriles_afectados', osp.carriles_afectados,
        'porcentaje', osp.porcentaje_obstruccion,
        'descripcion', COALESCE(osp.descripcion_manual, osp.descripcion_generada)
    )
    FROM obstruccion_situacion_persistente osp
    WHERE osp.situacion_persistente_id = sp.id
    LIMIT 1) AS obstruccion,

    -- Lista de autoridades presentes
    (SELECT json_agg(json_build_object(
        'id', asp.id,
        'tipo', asp.tipo_autoridad,
        'hora_llegada', asp.hora_llegada,
        'nip_chapa', asp.nip_chapa,
        'numero_unidad', asp.numero_unidad,
        'nombre_comandante', asp.nombre_comandante,
        'cantidad_elementos', asp.cantidad_elementos,
        'cantidad_unidades', asp.cantidad_unidades
    ))
    FROM autoridad_situacion_persistente asp
    WHERE asp.situacion_persistente_id = sp.id) AS autoridades,

    -- Lista de unidades de socorro
    (SELECT json_agg(json_build_object(
        'id', ssp.id,
        'tipo', ssp.tipo_socorro,
        'hora_llegada', ssp.hora_llegada,
        'nip_chapa', ssp.nip_chapa,
        'numero_unidad', ssp.numero_unidad,
        'nombre_comandante', ssp.nombre_comandante,
        'cantidad_elementos', ssp.cantidad_elementos,
        'cantidad_unidades', ssp.cantidad_unidades
    ))
    FROM socorro_situacion_persistente ssp
    WHERE ssp.situacion_persistente_id = sp.id) AS socorro,

    -- Cantidad de fotos y videos
    (SELECT COUNT(*) FROM multimedia_situacion_persistente msp
     WHERE msp.situacion_persistente_id = sp.id AND msp.tipo = 'foto') AS cantidad_fotos,
    (SELECT COUNT(*) FROM multimedia_situacion_persistente msp
     WHERE msp.situacion_persistente_id = sp.id AND msp.tipo = 'video') AS cantidad_videos,

    -- Lista de multimedia
    (SELECT json_agg(json_build_object(
        'id', msp.id,
        'tipo', msp.tipo,
        'url', msp.url,
        'url_thumbnail', msp.url_thumbnail,
        'nombre_archivo', msp.nombre_archivo,
        'orden', msp.orden
    ) ORDER BY msp.tipo, msp.orden)
    FROM multimedia_situacion_persistente msp
    WHERE msp.situacion_persistente_id = sp.id) AS multimedia

FROM situacion_persistente sp
LEFT JOIN ruta r ON sp.ruta_id = r.id
LEFT JOIN tipo_emergencia_vial tev ON sp.tipo_emergencia_id = tev.id
LEFT JOIN usuario uc ON sp.creado_por = uc.id
LEFT JOIN usuario ucerr ON sp.cerrado_por = ucerr.id
LEFT JOIN usuario uprom ON sp.promovido_por = uprom.id
LEFT JOIN situacion so ON sp.situacion_origen_id = so.id;

COMMENT ON VIEW v_situaciones_persistentes_completas IS 'Vista completa de situaciones persistentes con todos los detalles agregados';

-- =====================================================
-- 9. FUNCION PARA PROMOVER SITUACION A PERSISTENTE
-- =====================================================

CREATE OR REPLACE FUNCTION fn_promover_a_persistente(
    p_situacion_id INTEGER,
    p_titulo VARCHAR(200),
    p_tipo_emergencia_id INTEGER,
    p_importancia VARCHAR(20),
    p_descripcion TEXT,
    p_promovido_por INTEGER
) RETURNS INTEGER AS $$
DECLARE
    v_situacion RECORD;
    v_nueva_id INTEGER;
    v_numero VARCHAR(20);
BEGIN
    -- Obtener datos de la situacion original
    SELECT s.*, r.codigo as ruta_codigo
    INTO v_situacion
    FROM situacion s
    LEFT JOIN ruta r ON s.ruta_id = r.id
    WHERE s.id = p_situacion_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Situacion no encontrada: %', p_situacion_id;
    END IF;

    -- Verificar que no haya sido promovida antes
    IF EXISTS (
        SELECT 1 FROM situacion_persistente
        WHERE situacion_origen_id = p_situacion_id
    ) THEN
        RAISE EXCEPTION 'Esta situacion ya fue promovida a persistente anteriormente';
    END IF;

    -- Generar numero de situacion persistente
    SELECT 'SP-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
           LPAD((COALESCE(MAX(CAST(SUBSTRING(numero FROM 9) AS INTEGER)), 0) + 1)::TEXT, 4, '0')
    INTO v_numero
    FROM situacion_persistente
    WHERE numero LIKE 'SP-' || TO_CHAR(NOW(), 'YYYY') || '-%';

    -- Crear situacion persistente
    INSERT INTO situacion_persistente (
        numero,
        titulo,
        tipo,
        tipo_emergencia_id,
        importancia,
        ruta_id,
        km_inicio,
        sentido,
        latitud,
        longitud,
        descripcion,
        estado,
        situacion_origen_id,
        es_promocion,
        fecha_promocion,
        promovido_por,
        creado_por,
        fecha_inicio
    ) VALUES (
        v_numero,
        COALESCE(p_titulo, 'Emergencia promovida - ' || COALESCE(v_situacion.ruta_codigo, 'Sin ruta')),
        COALESCE((SELECT codigo FROM tipo_emergencia_vial WHERE id = p_tipo_emergencia_id), 'OTRO'),
        p_tipo_emergencia_id,
        COALESCE(p_importancia, 'ALTA'),
        v_situacion.ruta_id,
        v_situacion.km,
        v_situacion.sentido,
        v_situacion.latitud,
        v_situacion.longitud,
        p_descripcion,
        'ACTIVA',
        p_situacion_id,
        TRUE,
        NOW(),
        p_promovido_por,
        p_promovido_por,
        NOW()
    ) RETURNING id INTO v_nueva_id;

    -- Asignar automaticamente la unidad que reporto la situacion
    IF v_situacion.unidad_id IS NOT NULL THEN
        INSERT INTO asignacion_situacion_persistente (
            situacion_persistente_id,
            unidad_id,
            km_asignacion,
            latitud_asignacion,
            longitud_asignacion,
            asignado_por,
            fecha_hora_asignacion
        ) VALUES (
            v_nueva_id,
            v_situacion.unidad_id,
            v_situacion.km,
            v_situacion.latitud,
            v_situacion.longitud,
            p_promovido_por,
            NOW()
        );
    END IF;

    -- Registrar en actualizaciones
    INSERT INTO actualizacion_situacion_persistente (
        situacion_persistente_id,
        usuario_id,
        unidad_id,
        tipo_actualizacion,
        contenido,
        fecha_hora
    ) VALUES (
        v_nueva_id,
        p_promovido_por,
        v_situacion.unidad_id,
        'CREACION',
        'Situacion promovida desde situacion normal #' || p_situacion_id,
        NOW()
    );

    RETURN v_nueva_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_promover_a_persistente IS 'Promueve una situacion normal a persistente extraordinaria, creando registro vinculado y asignando unidad automaticamente';

-- =====================================================
-- 10. TRIGGER PARA UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a tablas nuevas
DROP TRIGGER IF EXISTS update_obstruccion_sit_pers_updated_at ON obstruccion_situacion_persistente;
CREATE TRIGGER update_obstruccion_sit_pers_updated_at
    BEFORE UPDATE ON obstruccion_situacion_persistente
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_autoridad_sit_pers_updated_at ON autoridad_situacion_persistente;
CREATE TRIGGER update_autoridad_sit_pers_updated_at
    BEFORE UPDATE ON autoridad_situacion_persistente
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_socorro_sit_pers_updated_at ON socorro_situacion_persistente;
CREATE TRIGGER update_socorro_sit_pers_updated_at
    BEFORE UPDATE ON socorro_situacion_persistente
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sub_rol_cop_updated_at ON sub_rol_cop;
CREATE TRIGGER update_sub_rol_cop_updated_at
    BEFORE UPDATE ON sub_rol_cop
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 11. PERMISOS (Si se usa sistema de permisos)
-- =====================================================

-- Asignar sub_rol_cop por defecto a usuarios COP existentes
-- Los usuarios COP sin sub_rol quedan como OPERADOR (solo lectura) por seguridad
UPDATE usuario u
SET sub_rol_cop_id = (SELECT id FROM sub_rol_cop WHERE codigo = 'OPERADOR')
WHERE u.rol_id = (SELECT id FROM rol WHERE nombre = 'COP')
AND u.sub_rol_cop_id IS NULL;

COMMIT;
